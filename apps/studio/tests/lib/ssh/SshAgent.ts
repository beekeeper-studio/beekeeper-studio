import { execSync } from "child_process";

export class SshAgent {
  private sock?: string;
  private pid?: string;

  start() {
    if (this.pid) {
      console.warn("SshAgent.start() called but agent is already running");
      return;
    }

    const output = execSync("ssh-agent -s", { encoding: "utf-8" });
    const sockMatch = output.match(/SSH_AUTH_SOCK=([^;]+)/);
    const pidMatch = output.match(/SSH_AGENT_PID=([^;]+)/);

    this.pid = pidMatch?.[1];
    this.sock = sockMatch?.[1];

    if (!this.sock || !this.pid) {
      this.stop();
      throw new Error("Failed to parse ssh-agent output: " + output);
    }
  }

  stop() {
    if (!this.pid) {
      return;
    }

    try {
      process.kill(parseInt(this.pid));
      this.pid = undefined;
    } catch {
      // agent already stopped
    }
  }

  /** Add a private key to the agent. Equivalent to `ssh-add`. */
  add(key: string) {
    execSync(`ssh-add ${key}`, {
      env: { ...process.env, SSH_AUTH_SOCK: this.sock },
    });
  }

  getSock() {
    if (!this.sock) {
      throw new Error("SshAgent.getSock() called but agent is not started");
    }
    return this.sock;
  }
}
