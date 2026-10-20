.PHONY: import applied

import:
	@./scripts/import_latest.sh

# $$URL and $$DATE are read by the shell from the environment (make exports
# variables given on the command line), so characters like ? and & arrive intact.
applied:
	@./scripts/mark_applied.sh "$$URL" "$$DATE"
