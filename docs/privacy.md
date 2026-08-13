# Privacy

Pocket Proof is a local benchmark application. After setup has provisioned the open source runtime and model artifacts, transcription runs on the local machine through native subprocesses.

The application does not include analytics, advertising, account creation, tracking cookies, or a hosted inference API. It does not upload audio, transcripts, device details, or benchmark reports. The local service binds to `127.0.0.1`. A user may explicitly export a report as a file or follow an external project link.

Provisioning uses network access to download pinned source and model artifacts from their documented upstream locations. Those requests are subject to the upstream providers' policies. See [third party notices](../THIRD_PARTY_NOTICES.md) for the complete provenance record.
