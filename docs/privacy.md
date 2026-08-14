# Privacy

Pocket Proof is a local transcription and benchmark application. After setup has provisioned the open source runtime and model artifacts, the native benchmark runs on the local machine through native subprocesses.

Hosted Judge Mode also provides an optional in-browser transcription tool. The selected audio or video file is decoded in the browser and passed to a Web Worker running a quantized Whisper Tiny English model through WebAssembly. The file and transcript are not sent to Pocket Proof, Hugging Face, jsDelivr, or a hosted transcription API.

The first browser run downloads pinned model files from Hugging Face and version-pinned model code and WebAssembly runtime files from jsDelivr. Those network requests identify the requested public artifacts but do not contain the user's audio or transcript. Supported browsers store downloaded model/runtime artifacts in browser cache for later runs. Clearing site data removes that cache.

The application does not include analytics, advertising, account creation, tracking cookies, or a hosted inference API. It does not upload audio, transcripts, device details, or benchmark reports. The local service binds to `127.0.0.1`. A user may explicitly copy or download a transcript, export a report as a file, or follow an external project link.

Provisioning uses network access to download pinned source and model artifacts from their documented upstream locations. Those requests are subject to the upstream providers' policies. See [third party notices](../THIRD_PARTY_NOTICES.md) for the complete provenance record.
