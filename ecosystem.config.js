// PM2 ecosystem config — Atelier Cils Paris
// Démarrer tout : pm2 start ecosystem.config.js
// Arrêter tout  : pm2 stop all
// Statut        : pm2 status
// Logs          : pm2 logs

module.exports = {
  apps: [
    {
      name: "atelier-cils-site",
      script: "node",
      args: ".next/standalone/server.js",
      cwd: __dirname,
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: "512M",
      env: {
        NODE_ENV: "production",
        PORT: 3000,
        HOSTNAME: "0.0.0.0",
      },
      error_file: "logs/site-error.log",
      out_file: "logs/site-out.log",
      log_date_format: "YYYY-MM-DD HH:mm:ss",
    },
    {
      name: "atelier-cils-email",
      script: "C:\\Windows\\System32\\cmd.exe",
      args: "/c node_modules\\.bin\\tsx.cmd scripts/email-worker-loop.ts",
      cwd: __dirname,
      exec_mode: "fork",
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: "128M",
      error_file: "logs/email-error.log",
      out_file: "logs/email-out.log",
      log_date_format: "YYYY-MM-DD HH:mm:ss",
    },
    {
      name: "atelier-cils-tunnel",
      script: "cloudflared.exe",
      args: "tunnel --url http://localhost:3000",
      cwd: __dirname,
      instances: 1,
      autorestart: true,
      watch: false,
      interpreter: "none",
      error_file: "logs/tunnel-error.log",
      out_file: "logs/tunnel-out.log",
      log_date_format: "YYYY-MM-DD HH:mm:ss",
    },
  ],
};
