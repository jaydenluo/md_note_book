import { getShellPlugin } from '@/utils/tauri';

export interface GitSyncConfig {
  repoUrl: string;
  branch: string;
  autoSync: boolean;
}

export class GitSyncService {
  private repoPath: string;

  constructor(repoPath: string) {
    this.repoPath = repoPath;
  }

  /**
   * 执行 git 命令的通用方法
   */
  private async execute(args: string[]): Promise<{ success: boolean; stdout: string; stderr: string }> {
    try {
      const shell = await getShellPlugin();
      if (!shell) {
        throw new Error('无法加载 Shell 插件，请检查 Tauri 配置');
      }
      
      const CommandClass = (shell as unknown as { Command: any }).Command;
      if (!CommandClass) {
        throw new Error('Shell 插件中未找到 Command 类');
      }

      console.log(`执行 Git 命令: git ${args.join(' ')}`);
      const command = CommandClass.create('git', args, { cwd: this.repoPath });
      const output = await command.execute();
      
      if (output.code !== 0) {
        console.error(`Git 命令执行失败 (代码 ${output.code}):`, output.stderr);
      }

      return {
        success: output.code === 0,
        stdout: output.stdout,
        stderr: output.stderr
      };
    } catch (error) {
      const errorMsg = String(error);
      console.error(`执行 Git 命令时抛出异常: git ${args.join(' ')}`, error);
      
      // 更加友好的错误提示
      let friendlyMsg = errorMsg;
      if (errorMsg.includes('program not found') || errorMsg.includes('entity not found')) {
        friendlyMsg = '系统未找到 git 命令，请确保已安装 Git 并将其添加到环境变量 PATH 中';
      }

      return {
        success: false,
        stdout: '',
        stderr: friendlyMsg
      };
    }
  }

  /**
   * 初始化 Git 仓库
   */
  async initRepo(repoUrl: string, branch: string = 'master'): Promise<{ success: boolean; error?: string }> {
    // 检查目录是否存在
    const res = await this.execute(['rev-parse', '--is-inside-work-tree']);
    if (!res.success) {
      // 如果报错是因为找不到 git 程序，直接返回该错误
      if (res.stderr.includes('未找到 git 命令')) {
        return { success: false, error: res.stderr };
      }

      // 不是仓库，初始化
      const init = await this.execute(['init']);
      if (!init.success) {
        return { success: false, error: `Git 初始化失败: ${init.stderr}` };
      }
    }

    // 配置用户信息（防止新环境下无法 commit）
    await this.execute(['config', 'user.name', 'NoteBook-User']);
    await this.execute(['config', 'user.email', 'notebook@local.com']);

    // 检查并设置远程仓库
    const remoteRes = await this.execute(['remote', 'get-url', 'origin']);
    if (remoteRes.success) {
      if (remoteRes.stdout.trim() !== repoUrl) {
        const setUrlRes = await this.execute(['remote', 'set-url', 'origin', repoUrl]);
        if (!setUrlRes.success) return { success: false, error: `设置远程仓库失败: ${setUrlRes.stderr}` };
      }
    } else {
      const remoteAdd = await this.execute(['remote', 'add', 'origin', repoUrl]);
      if (!remoteAdd.success) return { success: false, error: `添加远程仓库失败: ${remoteAdd.stderr}` };
    }

    // 获取远程状态
    const fetchRes = await this.execute(['fetch', 'origin']);
    if (!fetchRes.success) {
      return { success: false, error: `无法连接到远程仓库: ${fetchRes.stderr}` };
    }

    // 切换/创建目标分支（本地分支）
    const checkoutRes = await this.execute(['checkout', '-B', branch]);
    if (!checkoutRes.success) {
      return { success: false, error: `切换分支失败: ${checkoutRes.stderr}` };
    }
    
    return { success: true };
  }

  /**
   * 判断当前目录是否为 Git 仓库
   */
  async isGitRepo(): Promise<{ success: boolean; isRepo: boolean; error?: string }> {
    const res = await this.execute(['rev-parse', '--is-inside-work-tree']);
    if (res.success) {
      return { success: true, isRepo: res.stdout.trim() === 'true' };
    }
    // 常见情况：不是仓库
    if (res.stderr.includes('not a git repository')) {
      return { success: true, isRepo: false };
    }
    return { success: false, isRepo: false, error: res.stderr };
  }

  /**
   * 获取远程仓库地址（默认 origin），不存在则返回 null
   */
  async getRemoteUrl(remoteName: string = 'origin'): Promise<string | null> {
    const res = await this.execute(['remote', 'get-url', remoteName]);
    if (!res.success) return null;
    const url = res.stdout.trim();
    return url ? url : null;
  }

  /**
   * 获取当前分支名称，失败则返回 null
   */
  async getCurrentBranch(): Promise<string | null> {
    const res = await this.execute(['rev-parse', '--abbrev-ref', 'HEAD']);
    if (!res.success) return null;
    const branch = res.stdout.trim();
    return branch ? branch : null;
  }

  /**
   * 判断工作区是否有未提交更改
   */
  async hasChanges(): Promise<boolean> {
    const res = await this.execute(['status', '--porcelain']);
    if (!res.success) return false;
    return Boolean(res.stdout.trim());
  }

  /**
   * 拉取最新代码
   */
  async pull(branch: string = 'master'): Promise<boolean> {
    // 尝试拉取，如果远程分支不存在则忽略
    const res = await this.execute(['pull', 'origin', branch, '--rebase']);
    return res.success || res.stderr.includes('couldn\'t find remote ref');
  }

  /**
   * 提交并推送
   */
  async commitAndPush(message: string = 'Auto-sync from NoteBook', branch: string = 'master'): Promise<boolean> {
    // 检查是否有更改
    const status = await this.execute(['status', '--porcelain']);
    if (!status.stdout.trim()) {
      console.log('No changes to commit');
      // 没有更改也算成功，因为我们需要执行 push 确保同步
    } else {
      await this.execute(['add', '.']);
      const commit = await this.execute(['commit', '-m', message]);
      if (!commit.success && !commit.stderr.includes('nothing to commit')) {
        return false;
      }
    }

    const push = await this.execute(['push', 'origin', branch]);
    return push.success;
  }

  /**
   * 检查状态
   */
  async checkStatus(): Promise<boolean> {
    const res = await this.execute(['remote', '-v']);
    return res.success;
  }
}
