module.exports = {
    apps: [{
      name: "nexus-community-dapp-static",  // 服务名称
      script: "npx serve",        // 启动静态服务的命令
      args: "-s dist -l 3001",    // 参数：指定dist目录、端口8080
      cwd: "/www/nexus-community-dapp",     // 项目目录（必须填）
      log_date_format: "YYYY-MM-DD HH:mm:ss",
      error_file: "/www/pm2/logs/community-static-err.log",  // 日志放/www盘
      out_file: "/www/pm2/logs/community-static-out.log",
      merge_logs: true,
      autorestart: true           // 崩溃自动重启
    }]
  };