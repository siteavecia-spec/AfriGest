# RBAC Matrix (Skeleton)

| Module                 | Action        | super_admin | pdg | dg  | employee |
|------------------------|---------------|-------------|-----|-----|----------|
| users                  | read/write    | yes         | yes | no  | no       |
| settings               | read/write    | yes         | yes | no  | no       |
| products               | read/write    | yes         | yes | yes | read     |
| suppliers              | read/write    | yes         | yes | yes | read     |
| stock                  | read          | yes         | yes | yes | read     |
| stock                  | write         | yes         | yes | yes | no       |
| sales                  | read          | yes         | yes | yes | own      |
| sales                  | write         | yes         | yes | yes | yes      |
| transfers              | read          | yes         | yes | yes | no       |
| transfers              | write         | yes         | yes | yes | no       |
| reports                | read          | yes         | yes | yes | no       |
| ecommerce.products     | read/write    | yes         | yes | yes | read     |
| ecommerce.orders       | read/write    | yes         | yes | yes | no       |
| ecommerce.settings     | read/write    | yes         | yes | no  | no       |
| admin/companies        | read/write    | yes         | no  | no  | no       |
| messaging              | read/write    | yes         | yes | yes | yes      |

Notes:
- "own" = accès aux ventes créées par l’utilisateur.
- Adapter la granularité selon besoins (ex: write séparé en create/update/delete).
