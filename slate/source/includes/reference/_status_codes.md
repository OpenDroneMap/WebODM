## Status Codes

Status | Code | Description
----- | ---- | -----------
QUEUED | 10 | [Task](#task)'s files have been uploaded to a [ProcessingNode](#processingnode) and are waiting to be processed.
RUNNING | 20 | [Task](#task) is currently being processed.
FAILED | 30 | [Task](#task) has failed for some reason (not enough images, out of memory, Piero forgot to close a parenthesis, etc.)
COMPLETED | 40 | [Task](#task) has completed. Assets are be ready to be downloaded.
CANCELED | 50 | [Task](#task) was manually canceled by the user.
