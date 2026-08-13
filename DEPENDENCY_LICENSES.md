# JavaScript dependency licenses

Pocket Proof does not commit `node_modules`. This notice identifies the direct JavaScript packages pinned by `package-lock.json`; each installed package retains its own copyright and license text. Transitive package names, exact versions, resolved artifacts, and integrity hashes remain machine-readable in `package-lock.json`.

| Package | Version | Role | Declared license |
| --- | ---: | --- | --- |
| `react` | 19.2.8 | UI runtime | MIT |
| `react-dom` | 19.2.8 | UI renderer | MIT |
| `vite` | 8.2.1 | Build and development server | MIT |
| `@vitejs/plugin-react` | 6.0.5 | React build integration | MIT |
| `@fontsource-variable/geist` | 5.3.0 | Locally bundled UI font | OFL-1.1 |
| `@fontsource-variable/geist-mono` | 5.3.0 | Locally bundled measurement font | OFL-1.1 |
| `ajv` | 8.20.0 | Benchmark report JSON Schema validation | MIT |
| `ajv-formats` | 3.0.1 | Date-time format validation for benchmark reports | MIT |
| `concurrently` | 10.0.4 | Local process orchestration | MIT |
| `typescript` | 7.0.2 | Type checking and compilation | Apache-2.0 |
| `vitest` | 4.1.10 | Test runner | MIT |
| `@types/node` | 26.2.0 | Type definitions | MIT |
| `@types/react` | 19.2.18 | Type definitions | MIT |
| `@types/react-dom` | 19.2.4 | Type definitions | MIT |

The locked transitive graph also contains packages declared under MIT, Apache-2.0, ISC, BSD-3-Clause, 0BSD, and MPL-2.0. The MPL-2.0 packages are `lightningcss` and its platform bindings; they are development/build dependencies and are not modified or committed by Pocket Proof. Use the upstream package contents installed by `npm ci` as the authoritative copyright and full-license source before shipping a binary or vendored dependency bundle.
