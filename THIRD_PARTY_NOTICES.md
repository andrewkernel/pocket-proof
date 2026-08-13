# Third-party notices

Pocket Proof includes or provisions third-party components only under their applicable licenses and terms. This file records provenance; it is not a substitute for bundled upstream license texts.

| Component | Use | Source / license location | Status |
| --- | --- | --- | --- |
| Arm STT-Runner | Native STT integration and benchmark foundation; pinned `bdabdb945f373651442a3693c0cd55d9af690e32` | [Arm-Examples/STT-Runner](https://github.com/Arm-Examples/STT-Runner), `LICENSES/` | Apache-2.0 plus bundled notices; retain applicable texts when distributed |
| whisper.cpp | Underlying STT engine through STT-Runner; embedded revision `2eeeba56e9edd762b4b38467bab96c2517163158` (v1.8.3) | [ggml-org/whisper.cpp](https://github.com/ggml-org/whisper.cpp) | MIT; retain notice when distributed |
| Arm KleidiAI | Separate same-model runtime ablation dependency | [ARM-software/kleidiai](https://github.com/ARM-software/kleidiai), `LICENSES/` | Retain applicable notices when bundled |
| Whisper small.en FP16 artifact | Primary reference model, `487614201` bytes, SHA-256 `c6138d6d58ecc8322097e0f987c32f1be8bb0a18532a3f88f734d1bbf9c41e5d` | [ggerganov/whisper.cpp models](https://huggingface.co/ggerganov/whisper.cpp), source revision `5359861c739e955e79d9a303bcbc70fb988958b1` | MIT, as declared by the model repository; the original [OpenAI Whisper](https://github.com/openai/whisper/blob/main/LICENSE) project is MIT |
| Whisper small.en Q4_0 artifact | Locally derived primary optimized model, `145471353` bytes, SHA-256 `37eb5db9875dae4fdf9b2727459ccbf2ee8ba9ef5590655bb13a7b573aae241b` | Derived from the verified FP16 artifact with `whisper-quantize ... q4_0` | Same upstream model terms apply |
| JFK benchmark audio/reference transcript | 11-second public-domain excerpt from President Kennedy's January 20, 1961 inaugural address; SHA-256 `59dfb9a4acb36fe2a2affc14bacbee2920ff435cb13cc314a08c13f66ba7860e` | `samples/jfk.wav`, distributed by [whisper.cpp](https://github.com/ggml-org/whisper.cpp); archival source: [JFK Library, JFKWHA-001](https://www.jfklibrary.org/asset-viewer/archives/jfkwha-001) | Public domain; the JFK Library identifies the recording as a U.S. federal-government work |
| Geist and Geist Mono | Locally bundled product typography | [Vercel Geist Font](https://github.com/vercel/geist-font), provisioned through `@fontsource-variable/geist` and `@fontsource-variable/geist-mono` 5.3.0 | SIL Open Font License 1.1; full text distributed at `public/licenses/geist-OFL-1.1.txt` |
| AI Design Skills | Product design reference; no source code bundled | [elayadesign/ai-design-skills](https://github.com/elayadesign/ai-design-skills) | MIT; attribution not required, recorded here for provenance |
| React, Vite, TypeScript, Node dependencies | Local UI/orchestration | [DEPENDENCY_LICENSES.md](DEPENDENCY_LICENSES.md), `package-lock.json`, and installed package license metadata | Recorded for the source distribution; reproduce upstream license texts when bundling dependencies |

No third-party logo, trademark, music, or corpus is included merely by mention in documentation. See [CONTRIBUTING.md](CONTRIBUTING.md) for contribution requirements.
