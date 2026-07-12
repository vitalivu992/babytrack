package migrations

import "embed"

// Files embeds all SQL migration files for runtime execution.
//
//go:embed *.sql
var Files embed.FS
