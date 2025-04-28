package main

import (
	"embed"
	"os"

	"github.com/rs/zerolog"
	"github.com/rs/zerolog/log"
	"github.com/spf13/cobra"

	"github.com/go-go-golems/claude-artifact-runner/pkg/server"
	"github.com/go-go-golems/claude-artifact-runner/pkg/types"
)

//go:embed dist
var distFS embed.FS

var rootCmd = &cobra.Command{
	Use:   "serve",
	Short: "Start the artifact viewer server",
	Long:  `Serves the artifact viewer application, handling both static files and dynamic routes.`,
	RunE: func(cmd *cobra.Command, args []string) error {
		// Get flags
		port, _ := cmd.Flags().GetInt("port")
		devMode, _ := cmd.Flags().GetBool("dev")
		debugMode, _ := cmd.Flags().GetBool("debug")

		// Configure zerolog
		zerolog.TimeFieldFormat = zerolog.TimeFormatUnix
		if debugMode {
			zerolog.SetGlobalLevel(zerolog.DebugLevel)
			log.Debug().Msg("Debug logging enabled")
		} else {
			zerolog.SetGlobalLevel(zerolog.InfoLevel)
		}

		// Create server configuration
		config := types.Config{
			Port:      port,
			DevMode:   devMode,
			DebugMode: debugMode,
		}

		// Create and start server
		s, err := server.NewServer(config, distFS)
		if err != nil {
			return err
		}

		return s.Start()
	},
}

func init() {
	// Add command line flags
	rootCmd.Flags().IntP("port", "p", 3000, "Port to serve on")
	rootCmd.Flags().BoolP("dev", "d", false, "Run in development mode")
	rootCmd.Flags().Bool("debug", false, "Enable debug logging")
}

func main() {
	// Set up colorized output
	log.Logger = log.Output(zerolog.ConsoleWriter{Out: os.Stderr})

	if err := rootCmd.Execute(); err != nil {
		log.Fatal().Err(err).Msg("Failed to execute command")
	}
}
