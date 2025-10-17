# 多服务器监控探针

一个基于Python和Web技术的简单服务器监控系统，可以监控多个服务器的CPU、内存和磁盘使用情况。

## 功能特点

- **无需安装任何程序即可实现服务器监控**
- 实时监控多个服务器的CPU、内存和磁盘使用率
- 通过SSH连接服务器获取信息
- 支持SSH密码和密钥两种方式进行登录
- 可视化展示服务器状态
- 自动定时更新数据

## 安装和配置

### 1. 安装依赖

```bash
pip install -r requirements.txt
```

### 2. 配置服务器信息

编辑 [hd/servers.json](hd/servers.json) 文件，添加要监控的服务器信息：

```json
[
    {
        "name": "example-password-server",
        "ip": "127.0.0.1",
        "port": 22,
        "username": "ssh-user",
        "password": "ssh-password"
    },
    {
        "name": "example-key-server",
        "ip": "203.0.113.10",
        "port": 22,
        "username": "ssh-user",
        "key_path": "/home/ssh-user/.ssh/id_rsa",
        "passphrase": ""
    }
]
```

> 说明：`password` 和 `key_path` 二选一；当使用密钥登录时，可选填写 `passphrase`（若密钥无口令则留空或删除该字段）。

如使用密钥登录请在 `hd/.ssh` 目录中添加密钥文件。

### 3. 运行监控程序

```bash
python hd/monitor.py
```

程序会每5分钟自动收集一次服务器信息并保存到 [web/data.json](web/data.json) 文件中。

### 4. 查看监控结果

打开 [web/index.html](web/index.html) 文件即可查看服务器监控信息。页面会每30秒自动刷新一次数据。


## 使用说明

新建一个站点

把整个项目clone到本地

在宝塔面板设置运行目录为web目录 **切记！！！**

在 hd/servers.json 中添加服务器信息

在守护进程添加并运行monitor.py程序

## 文件说明

- [hd/monitor.py](hd/monitor.py): 后端监控程序，负责通过SSH获取服务器信息
- [hd/servers.json](hd/servers.json): 服务器配置文件
- [web/data.json](web/data.json): 监控数据存储文件
- [web/index.html](web/index.html): 前端展示页面
- [requirements.txt](requirements.txt): Python依赖包列表

## 注意事项

1. 确保目标服务器开启了SSH服务
2. 确保网络可以访问目标服务器的SSH端口
3. 建议使用密钥认证替代密码认证以提高安全性
4. 在生产环境中，建议将密码等敏感信息加密存储
