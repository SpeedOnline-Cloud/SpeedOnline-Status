# SpeedOnline Monitoring Dashboard
# Author: chaoweilangmao
import json
import os
import time
from datetime import datetime

import paramiko
import schedule
import threading

def get_server_info(server):
    """
    通过SSH获取单个服务器的信息
    """
    try:
        # 创建SSH客户端
        ssh = paramiko.SSHClient()
        ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
        
        # 连接服务器
        connect_kwargs = {
            'hostname': server['ip'],
            'port': server.get('port', 22),
            'username': server['username'],
            'allow_agent': False,
            'look_for_keys': False,
            'timeout': 10,
        }

        key_path = server.get('key_path') or server.get('key_filename')
        if key_path:
            connect_kwargs['key_filename'] = os.path.expanduser(key_path)
            passphrase = server.get('passphrase') or server.get('key_passphrase')
            if passphrase:
                connect_kwargs['passphrase'] = passphrase
        elif server.get('password'):
            connect_kwargs['password'] = server['password']
        else:
            raise ValueError(f"服务器 {server.get('name', server.get('ip'))} 缺少认证信息，请提供 password 或 key_path。")

        ssh.connect(**connect_kwargs)
        
        # 获取CPU使用率（针对多核CPU系统）
        # 使用top命令获取所有CPU核心的使用情况，然后计算平均值
        stdin, stdout, stderr = ssh.exec_command("top -bn1 | grep '%Cpu(s)' | awk '{print $2}' | cut -d'%' -f1")
        cpu_lines = stdout.read().decode('utf-8').strip().split('\n')
        
        # 如果有多行CPU数据，计算平均值
        if cpu_lines and cpu_lines != ['']:
            valid_cpu_usages = []
            for line in cpu_lines:
                if line.replace('.', '', 1).isdigit():
                    valid_cpu_usages.append(float(line))
            
            if valid_cpu_usages:
                cpu_usage = sum(valid_cpu_usages) / len(valid_cpu_usages)
            else:
                cpu_usage = 0
        else:
            # 备用方法：获取整体CPU使用率
            stdin, stdout, stderr = ssh.exec_command("top -bn1 | grep 'Cpu(s)' | awk '{print $2}' | cut -d'%' -f1")
            cpu_usage_str = stdout.read().decode('utf-8').strip()
            cpu_usage = float(cpu_usage_str) if cpu_usage_str.replace('.', '', 1).isdigit() else 0
        
        # 获取内存使用率
        stdin, stdout, stderr = ssh.exec_command("free | grep Mem | awk '{printf(\"%.2f\", $3/$2 * 100.0)}'")
        memory_usage = stdout.read().decode('utf-8').strip() or "0"
        
        # 获取所有磁盘使用率
        stdin, stdout, stderr = ssh.exec_command("df -h | grep '^/dev' | awk '{print $5}' | sed 's/%//'")
        disk_usages = stdout.read().decode('utf-8').strip().split('\n')
        
        # 计算所有磁盘的平均使用率
        valid_disk_usages = [int(usage) for usage in disk_usages if usage.isdigit()]
        if valid_disk_usages:
            disk_usage = sum(valid_disk_usages) / len(valid_disk_usages)
        else:
            disk_usage = 0
        
        # 关闭连接
        ssh.close()
        
        return {
            "name": server['name'],
            # "ip": server['ip'],
            "cpu": float(cpu_usage),
            "memory": float(memory_usage),
            "disk": float(disk_usage),
            "last_update": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
            "status": "online"
        }
    except Exception as e:
        return {
            "name": server['name'],
            # "ip": server['ip'],
            "cpu": 0,
            "memory": 0,
            "disk": 0,
            "last_update": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
            "status": "offline"
        }

def collect_all_servers_info():
    """
    收集所有服务器信息并保存到文件
    """
    try:
        # 读取服务器配置（使用utf-8-sig编码处理BOM）
        with open('servers.json', 'r', encoding='utf-8-sig') as f:
            servers = json.load(f)
        
        # 收集所有服务器信息
        results = []
        for server in servers:
            info = get_server_info(server)
            results.append(info)
            print(f"服务器 {info['name']} 状态: {info['status']}")
        
        # 保存到文件（指定UTF-8编码）
        with open('../web/data.json', 'w', encoding='utf-8') as f:
            json.dump(results, f, indent=2, ensure_ascii=False)
            
        print(f"[{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}] 数据更新完成")
        
    except Exception as e:
        print(f"收集服务器信息时出错: {e}")

def run_scheduler():
    """
    运行定时任务
    """
    # 立即执行一次
    collect_all_servers_info()
    
    # 每5分钟执行一次
    schedule.every(5).minutes.do(collect_all_servers_info)
    
    while True:
        schedule.run_pending()
        time.sleep(1)

if __name__ == "__main__":
    print("启动服务器监控程序...")
    run_scheduler()
