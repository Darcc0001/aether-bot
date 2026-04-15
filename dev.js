const { spawn } = require('child_process');

const children = [];

function launch(name, script) {
  const child = spawn(process.execPath, [script], {
    stdio: 'inherit',
    env: process.env,
  });

  children.push(child);

  child.on('exit', (code, signal) => {
    if (signal) {
      console.log(`${name} exited from signal ${signal}`);
      return;
    }

    console.log(`${name} exited with code ${code}`);
  });
}

function shutdown(exitCode) {
  for (const child of children) {
    if (!child.killed) {
      child.kill();
    }
  }

  process.exit(exitCode);
}

launch('bot', 'index.js');
launch('oauth', 'server.js');

process.on('SIGINT', () => shutdown(0));
process.on('SIGTERM', () => shutdown(0));
