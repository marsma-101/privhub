# PrivHub

#### Description
PrivHub — a LAN file hub center: a file management system built on a pure Cordis base with self-developed plugins. Ready to use, encrypted at rest, and deployable as a private service.

#### Software Architecture
- **Pure Cordis base**: only depends on `@deepseek-ai/cordis` (~240KB) + `schemastery` + `tsx`. No heavy framework; the whole directory can be moved and run as-is.
- **Three-layer plugin architecture**:
  - L1 core hub: core / auth / files / trash / admin / shell (manifest aggregation)
  - L2 capability services: storage / audit / acl / watermark / search / meta / collab / office
  - L3 feature plugins: auto-discovered and assembled (add/remove = add/remove a `plugins/` directory, no code changes)
- **Self-developed webServer** (node:http): exact-route + static frontend + `/privhub-plugins/<name>/<file>` plugin asset mapping.
- **Frontend**: Vue single-page skeleton + manifest/slot loader; pure-frontend plugins work out of the box.

#### Installation

1. Requirement: Node.js 18+ (no other runtime needed).
2. Install dependencies: `npm install` (restores runtime packages such as cordis / schemastery / tsx).
3. Start dev environment: double-click `start.bat`, visit http://127.0.0.1:3180
4. Production: `start.bat 3181`, visit http://127.0.0.1:3181

#### Instructions

1. Default account is generated on first launch: `admin` / `admin123` (change the password immediately after login).
2. All data (user files + system data + audit logs) is encrypted at rest with AES-256-GCM; the key `data/secret.key` must be backed up together with the data — losing the key means the data cannot be recovered.
3. Full deployment, migration, and plugin development guide: [`privhub/部署说明.md`](privhub/部署说明.md).

#### Contribution

1.  Fork the repository
2.  Create Feat_xxx branch
3.  Commit your code
4.  Create Pull Request


#### Gitee Feature

1.  You can use Readme\_XXX.md to support different languages, such as Readme\_en.md, Readme\_zh.md
2.  Gitee blog [blog.gitee.com](https://blog.gitee.com)
3.  Explore open source project [https://gitee.com/explore](https://gitee.com/explore)
4.  The most valuable open source project [GVP](https://gitee.com/gvp)
5.  The manual of Gitee [https://gitee.com/help](https://gitee.com/help)
6.  The most popular members  [https://gitee.com/gitee-stars/](https://gitee.com/gitee-stars/)
