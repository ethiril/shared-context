#!/usr/bin/env bash
#
# Interactive helper for linking framework/commands/*.md into
# ~/.claude/commands/. Run with no arguments — you'll be dropped into a
# menu-driven session. Nothing on disk changes until you explicitly choose
# the `apply` or `force` action.
#
# The shared-context root is resolved from this script's own location, so
# the script works from any working directory. Set SHARED_CONTEXT_ROOT to
# override the root, or CLAUDE_COMMANDS_DIR to override the target
# directory (defaults to ~/.claude/commands).
#
# Color output is automatic when stdout is a terminal. Set NO_COLOR=1 (or
# pipe the output) to disable.

set -eo pipefail

# ---- color palette ----
#
# Enabled only when stdout is a TTY and NO_COLOR is unset. When disabled
# every variable is empty so escape sequences never leak into output.
# Semantics:
#   green   in_sync / applied actions
#   yellow  needs action (drift, missing, copy_in_sync, copy_drift, defer)
#   red     conflict / blocked
#   cyan    structural accent (paths, command shortcuts, prompt arrow)
#   bold    headers, names, counts
#   dim     secondary text (descriptions, notes, untouched files)

if [[ -t 1 && -z "${NO_COLOR:-}" ]]; then
  color_reset=$'\033[0m'
  color_bold=$'\033[1m'
  color_dim=$'\033[2m'
  color_red=$'\033[31m'
  color_green=$'\033[32m'
  color_yellow=$'\033[33m'
  color_cyan=$'\033[36m'
  diff_colors_enabled=1
else
  color_reset=""
  color_bold=""
  color_dim=""
  color_red=""
  color_green=""
  color_yellow=""
  color_cyan=""
  diff_colors_enabled=0
fi

# ---- paths (computed once at startup) ----

script_directory="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
shared_context_root="${SHARED_CONTEXT_ROOT:-$(cd -- "$script_directory/../.." && pwd)}"
source_directory="$shared_context_root/framework/commands"
destination_directory="${CLAUDE_COMMANDS_DIR:-$HOME/.claude/commands}"

if [[ ! -d "$source_directory" ]]; then
  echo "source directory missing: $source_directory" >&2
  exit 1
fi
mkdir -p "$destination_directory"

# ---- shared state ----
#
# Populated by reclassify_destination_state at startup and refreshed after
# every mutating action so subsequent commands see accurate state.
# Indexes line up across source_files, classified_actions, classified_notes.
#
#   in_sync         symlink already points to source
#   drift           symlink exists but points elsewhere
#   missing         no entry at destination
#   copy_in_sync    regular file identical to source (safe to replace)
#   copy_drift      regular file differs from source (force required)
#   conflict        unsupported file type (e.g. directory) — manual only

source_files=()
classified_actions=()
classified_notes=()
untouched_basenames=()

reclassify_destination_state() {
  source_files=()
  classified_actions=()
  classified_notes=()
  untouched_basenames=()

  shopt -s nullglob
  source_files=("$source_directory"/*.md)
  shopt -u nullglob

  if (( ${#source_files[@]} == 0 )); then
    echo "no .md files in $source_directory" >&2
    exit 1
  fi

  local source_file destination_path existing_symlink_target action note diff_summary
  for source_file in "${source_files[@]}"; do
    destination_path="$destination_directory/$(basename "$source_file")"

    if [[ -L "$destination_path" ]]; then
      existing_symlink_target="$(readlink "$destination_path")"
      if [[ "$existing_symlink_target" == "$source_file" ]]; then
        action="in_sync"
        note="symlink already correct"
      else
        action="drift"
        note="symlink points elsewhere (was $existing_symlink_target)"
      fi
    elif [[ ! -e "$destination_path" ]]; then
      action="missing"
      note="no entry yet"
    elif [[ -f "$destination_path" ]]; then
      if cmp -s "$source_file" "$destination_path"; then
        action="copy_in_sync"
        note="identical copy; safe to replace with symlink"
      else
        # `diff` exits 1 when files differ; absorb so pipefail doesn't abort.
        diff_summary="$({ diff "$destination_path" "$source_file" || true; } \
          | awk '/^</{r++} /^>/{a++} END{printf "+%d/-%d lines", a+0, r+0}')"
        action="copy_drift"
        note="differs from source ($diff_summary)"
      fi
    else
      action="conflict"
      note="unsupported file type at destination"
    fi

    classified_actions+=("$action")
    classified_notes+=("$note")
  done

  shopt -s nullglob
  local existing_destination_files=("$destination_directory"/*.md)
  shopt -u nullglob

  local source_basename_list=" "
  for source_file in "${source_files[@]}"; do
    source_basename_list+="$(basename "$source_file") "
  done

  local destination_entry destination_basename
  for destination_entry in "${existing_destination_files[@]}"; do
    destination_basename="$(basename "$destination_entry")"
    if [[ "$source_basename_list" != *" $destination_basename "* ]]; then
      untouched_basenames+=("$destination_basename")
    fi
  done
}

# ---- color dispatchers ----
#
# state_color maps a classification state to its display color, used by the
# status and plan printers. outcome_color does the same for an apply verb,
# used by the apply printer. Centralising the palette here keeps theme
# changes one-place edits.

state_color() {
  case "$1" in
    in_sync)  printf '%s' "$color_green" ;;
    conflict) printf '%s' "$color_red" ;;
    *)        printf '%s' "$color_yellow" ;;
  esac
}

outcome_color() {
  case "$1" in
    skip)    printf '%s' "$color_dim" ;;
    defer)   printf '%s' "$color_yellow" ;;
    blocked) printf '%s' "$color_red" ;;
    *)       printf '%s' "$color_green" ;;
  esac
}

print_horizontal_rule() {
  printf '%s──────────────────────────────────────────────────────────%s\n' \
    "$color_dim" "$color_reset"
}

# ---- printers ----

print_status_summary() {
  local in_sync_count=0 drift_count=0 missing_count=0
  local copy_in_sync_count=0 copy_drift_count=0 conflict_count=0
  local action
  for action in "${classified_actions[@]}"; do
    case "$action" in
      in_sync)      in_sync_count=$((in_sync_count + 1)) ;;
      drift)        drift_count=$((drift_count + 1)) ;;
      missing)      missing_count=$((missing_count + 1)) ;;
      copy_in_sync) copy_in_sync_count=$((copy_in_sync_count + 1)) ;;
      copy_drift)   copy_drift_count=$((copy_drift_count + 1)) ;;
      conflict)     conflict_count=$((conflict_count + 1)) ;;
    esac
  done

  local needs_apply_count=$((drift_count + missing_count + copy_in_sync_count + copy_drift_count))

  echo "${color_bold}Target:${color_reset} ${color_cyan}${destination_directory}${color_reset}"
  echo "  ${color_green}${in_sync_count}${color_reset} in sync, ${color_yellow}${needs_apply_count}${color_reset} need apply, ${color_red}${conflict_count}${color_reset} conflict(s), ${color_dim}${#untouched_basenames[@]} untouched${color_reset}."
  if (( copy_drift_count > 0 )); then
    echo "  ${color_dim}(${copy_drift_count} of those need 'force' — they differ from source.)${color_reset}"
  fi
}

# Menu data, shared by print_menu (full, with descriptions) and
# print_menu_compact (one-line bracketed shortcuts). Format per entry:
#   "<shortcut>|<command name>|<description>"
menu_entries=(
  "s|status|per-file states (compact)"
  "p|plan|plan with target paths and notes"
  "d|diff|unified diff for drifting files (optional: d <name>)"
  "a|apply|create symlinks for in_sync, missing, drift, copy_in_sync"
  "f|force|apply, plus replace copy_drift files (.bak backups first)"
  "r|refresh|re-scan the destination directory"
  "h|help|state glossary and environment overrides"
  "q|quit|leave the script"
)

print_menu() {
  echo "${color_bold}Commands:${color_reset}"
  local entry shortcut name description
  for entry in "${menu_entries[@]}"; do
    IFS='|' read -r shortcut name description <<<"$entry"
    printf "  %s%s%s  %s%-7s%s  %s%s%s\n" \
      "$color_bold$color_cyan" "$shortcut" "$color_reset" \
      "$color_bold" "$name" "$color_reset" \
      "$color_dim" "$description" "$color_reset"
  done
}

# Single-line reminder of the same menu, designed to sit just above the
# prompt so the user never needs to scroll up to remember the shortcuts.
# Each entry renders as "[X]rest" — the bracketed letter is the key to
# press; the rest of the word is dimmed.
print_menu_compact() {
  local entry shortcut name description first_letter remaining_letters
  local rendered_line=""
  for entry in "${menu_entries[@]}"; do
    IFS='|' read -r shortcut name description <<<"$entry"
    first_letter="${name:0:1}"
    remaining_letters="${name:1}"
    if [[ -n "$rendered_line" ]]; then
      rendered_line+="  "
    fi
    rendered_line+="${color_dim}[${color_reset}${color_bold}${color_cyan}${first_letter}${color_reset}${color_dim}]${remaining_letters}${color_reset}"
  done
  echo "$rendered_line"
}

print_status_detail() {
  echo "${color_bold}Target:${color_reset} ${color_cyan}${destination_directory}${color_reset}"
  echo
  local index action action_color name
  for index in "${!source_files[@]}"; do
    action="${classified_actions[$index]}"
    action_color="$(state_color "$action")"
    name="$(basename "${source_files[$index]}")"
    printf "  %-22s %s%s%s\n" "$name" "$action_color" "$action" "$color_reset"
  done

  if (( ${#untouched_basenames[@]} > 0 )); then
    echo
    echo "${color_bold}Untouched in target${color_reset} ${color_dim}(no source counterpart):${color_reset}"
    local untouched_entry
    for untouched_entry in "${untouched_basenames[@]}"; do
      echo "  ${color_dim}${untouched_entry}${color_reset}"
    done
  fi
}

print_plan_detail() {
  echo "${color_bold}Source:${color_reset} ${color_cyan}${source_directory}${color_reset}"
  echo "${color_bold}Target:${color_reset} ${color_cyan}${destination_directory}${color_reset}"
  echo

  local index source_file action note name action_color padded_action
  for index in "${!source_files[@]}"; do
    source_file="${source_files[$index]}"
    action="${classified_actions[$index]}"
    note="${classified_notes[$index]}"
    name="$(basename "$source_file")"
    action_color="$(state_color "$action")"
    printf -v padded_action "%-15s" "$action"

    printf "  %-22s %s%s%s %s%s%s\n" \
      "$name" \
      "$action_color" "$padded_action" "$color_reset" \
      "$color_dim" "$note" "$color_reset"
    if [[ "$action" != "conflict" ]]; then
      printf "    %s-> %s%s\n" "$color_dim" "$source_file" "$color_reset"
    fi
  done

  if (( ${#untouched_basenames[@]} > 0 )); then
    echo
    echo "${color_bold}Untouched in target${color_reset} ${color_dim}(no source counterpart):${color_reset}"
    local untouched_entry
    for untouched_entry in "${untouched_basenames[@]}"; do
      echo "  ${color_dim}${untouched_entry}${color_reset}"
    done
  fi
}

print_diff_for_drifting() {
  local requested_name="${1:-}"
  if [[ -n "$requested_name" && "$requested_name" != *.md ]]; then
    requested_name="$requested_name.md"
  fi

  local printed_any=0 index source_file action name destination_path
  for index in "${!source_files[@]}"; do
    source_file="${source_files[$index]}"
    action="${classified_actions[$index]}"
    name="$(basename "$source_file")"

    if [[ "$action" != "copy_drift" ]]; then
      continue
    fi
    if [[ -n "$requested_name" && "$requested_name" != "$name" ]]; then
      continue
    fi

    destination_path="$destination_directory/$name"
    echo "${color_bold}${color_cyan}=== ${name} ===${color_reset}"

    if (( diff_colors_enabled )); then
      { diff -u "$destination_path" "$source_file" || true; } | awk \
        -v bold="$color_bold" \
        -v red="$color_red" \
        -v green="$color_green" \
        -v cyan="$color_cyan" \
        -v reset="$color_reset" '
          /^---|^\+\+\+/ { print bold $0 reset; next }
          /^@@/          { print cyan $0 reset; next }
          /^\+/          { print green $0 reset; next }
          /^-/           { print red $0 reset; next }
                         { print }
        '
    else
      diff -u "$destination_path" "$source_file" || true
    fi

    echo
    printed_any=1
  done

  if (( ! printed_any )); then
    if [[ -n "$requested_name" ]]; then
      echo "${color_yellow}no drifting file named '${requested_name}'${color_reset} (try 'status' to list)."
    else
      echo "${color_green}no drifting files; nothing to diff.${color_reset}"
    fi
  fi
}

apply_changes_to_destination() {
  local replace_drift="${1:-0}"

  local applied_count=0 deferred_count=0 blocked_count=0
  local backup_paths=()
  local index source_file action name destination_path verb note verb_color padded_verb

  for index in "${!source_files[@]}"; do
    source_file="${source_files[$index]}"
    action="${classified_actions[$index]}"
    name="$(basename "$source_file")"
    destination_path="$destination_directory/$name"

    case "$action" in
      in_sync)
        verb="skip"
        note="(already linked)"
        ;;
      drift)
        ln -sfn "$source_file" "$destination_path"
        verb="repoint"
        note="(symlink updated)"
        applied_count=$((applied_count + 1))
        ;;
      missing)
        ln -s "$source_file" "$destination_path"
        verb="create"
        note="(symlink created)"
        applied_count=$((applied_count + 1))
        ;;
      copy_in_sync)
        rm -f -- "$destination_path"
        ln -s "$source_file" "$destination_path"
        verb="replace"
        note="(identical copy -> symlink)"
        applied_count=$((applied_count + 1))
        ;;
      copy_drift)
        if (( replace_drift )); then
          cp -- "$destination_path" "$destination_path.bak"
          rm -f -- "$destination_path"
          ln -s "$source_file" "$destination_path"
          backup_paths+=("$destination_path.bak")
          verb="replace"
          note="(backup written, then -> symlink)"
          applied_count=$((applied_count + 1))
        else
          verb="defer"
          note="(differs from source; use 'force' to overwrite)"
          deferred_count=$((deferred_count + 1))
        fi
        ;;
      conflict)
        verb="blocked"
        note="(unsupported file type; manual fix needed)"
        blocked_count=$((blocked_count + 1))
        ;;
    esac

    verb_color="$(outcome_color "$verb")"
    printf -v padded_verb "%-9s" "$verb"
    printf "  %-22s %s%s%s %s%s%s\n" \
      "$name" \
      "$verb_color" "$padded_verb" "$color_reset" \
      "$color_dim" "$note" "$color_reset"
  done

  echo
  echo "${color_bold}Applied ${color_green}${applied_count}${color_reset}${color_bold} change(s).${color_reset}"
  if (( deferred_count > 0 )); then
    echo "${color_yellow}${deferred_count} file(s) deferred${color_reset} — run 'force' to replace them (with .bak backups)."
  fi
  if (( blocked_count > 0 )); then
    echo "${color_red}${blocked_count} file(s) blocked${color_reset} — see 'blocked' lines above for the reason."
  fi

  if (( ${#backup_paths[@]} > 0 )); then
    echo
    echo "${color_bold}Backups written${color_reset} ${color_dim}(restore one with: mv FILE.bak FILE):${color_reset}"
    local backup_path
    for backup_path in "${backup_paths[@]}"; do
      echo "  ${color_dim}${backup_path}${color_reset}"
    done
  fi
}

print_help_screen() {
  echo "${color_bold}State glossary${color_reset} ${color_dim}(shown in 'status' and 'plan'):${color_reset}"
  echo
  echo "  ${color_green}in_sync${color_reset}         symlink already points to the framework source"
  echo "  ${color_yellow}drift${color_reset}           symlink exists but points somewhere else;"
  echo "                  apply will repoint it"
  echo "  ${color_yellow}missing${color_reset}         no entry at destination yet;"
  echo "                  apply will create the symlink"
  echo "  ${color_yellow}copy_in_sync${color_reset}    regular file whose content matches source;"
  echo "                  apply replaces it with a symlink (safe — same bytes)"
  echo "  ${color_yellow}copy_drift${color_reset}      regular file whose content differs from source;"
  echo "                  force replaces it with a symlink (writes .bak first)"
  echo "  ${color_red}conflict${color_reset}        something else at the destination (e.g. a directory);"
  echo "                  needs manual fix — this script never touches these"
  echo
  echo "${color_dim}Files in the target directory that have no counterpart in${color_reset}"
  echo "${color_dim}framework/commands/ are never touched. Run 'status' to see them listed.${color_reset}"
  echo
  echo "${color_bold}Environment overrides:${color_reset}"
  echo "  ${color_cyan}SHARED_CONTEXT_ROOT${color_reset}   override the shared-context root"
  echo "                        ${color_dim}(default: this script's grandparent directory)${color_reset}"
  echo "  ${color_cyan}CLAUDE_COMMANDS_DIR${color_reset}   override the target directory"
  echo "                        ${color_dim}(default: ~/.claude/commands)${color_reset}"
  echo "  ${color_cyan}NO_COLOR${color_reset}              set to disable color output"
}

# ---- main loop ----

echo "${color_bold}setup-claude.sh${color_reset} ${color_dim}— link framework commands into ~/.claude/commands/${color_reset}"
echo
reclassify_destination_state
print_status_summary
echo
print_menu

while true; do
  echo
  prompt_string="${color_dim}[h for help]${color_reset} ${color_bold}${color_cyan}>${color_reset} "
  if ! read -r -p "$prompt_string" user_input_line; then
    echo
    break
  fi

  if [[ -z "$user_input_line" ]]; then
    continue
  fi

  read -r user_command remaining_input <<<"$user_input_line"

  case "$user_command" in
    s|status)
      print_status_detail
      ;;
    p|plan)
      print_plan_detail
      ;;
    d|diff)
      print_diff_for_drifting "$remaining_input"
      ;;
    a|apply)
      apply_changes_to_destination 0
      reclassify_destination_state
      ;;
    f|force)
      confirm_prompt="${color_yellow}About to replace drifting files${color_reset} (a .bak backup is written for each). ${color_bold}Confirm? [y/N]:${color_reset} "
      read -r -p "$confirm_prompt" confirmation_response
      if [[ "$confirmation_response" == "y" || "$confirmation_response" == "Y" ]]; then
        apply_changes_to_destination 1
        reclassify_destination_state
      else
        echo "${color_dim}(force cancelled)${color_reset}"
      fi
      ;;
    r|refresh)
      reclassify_destination_state
      echo "${color_dim}Re-scanned destination.${color_reset}"
      ;;
    h|help)
      print_help_screen
      ;;
    q|quit|exit)
      echo "${color_dim}bye.${color_reset}"
      break
      ;;
    *)
      echo "${color_red}unknown command:${color_reset} '${user_command}' ${color_dim}(type 'h' for the menu).${color_reset}"
      ;;
  esac

  echo
  print_horizontal_rule
  print_status_summary
  echo
  print_menu_compact
done
