## vidExtractor
This NodeJS microservice is responsible for downloading the YouTube audio file and save it to a shared volume so it can be accessed by all microservices.<br>
The URL link is provided by the RabbitMQ in the `musicExtraction` queue list.<br>
When finished with success it sends the videoID to the `musicFeatures` queue list.

### Docker Params
| Arg | Default | Description |
| --- | --- | --- |
| URL | localhost | URL to check |
| HOST | localhost | RabbitMQ host |
| USER | merUser | HTTP basic auth username  |
| PASS | passwordMER | HTTP basic auth password |
| PORT | 5672 | RabbitMQ Port |
| MNG_PORT | 15672 | RabbitMQ Management Port |
| TIME | 10 | Timeout to check if the service is up |

### Volume
| Container Path | Description |
| --- | --- |
| `/vidExtractor/Audios` | Folder where the downloaded audio files are saved |