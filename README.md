## vidExtractor
This NodeJS microservice is responsible for downloading the YouTube audio file and save it to a shared volume so it can be accessed by all microservices.<br>
The URL link is provided by the RabbitMQ in the `musicExtraction` queue list.<br>
When finished with success it sends the videoID to the queue `musicFeatures` for music features extraction and `soundWaves` for the soundwave music generation.

### Docker Params
| Arg | Default | Description |
| --- | --- | --- |
| HOST | localhost | RabbitMQ host |
| USER | guest | HTTP basic auth username  |
| PASS | guest | HTTP basic auth password |
| PORT | 5672 | RabbitMQ Port |
| MNG_PORT | 15672 | RabbitMQ Management Port |
| TIME | 10 | Timeout to check if the service is up |

### Volume
| Container Path | Description |
| --- | --- |
| `/Audios` | Folder where the downloaded audio files are saved |

### RabbitMQ Queues
* Read from `musicFeatures`
    * Payload: `vID` (Video ID)
* Send to `soundWaves`
    * Payload: `vID` (Video ID)

### Run Local Microservice
Run Rabbit
```
docker run -d -e RABBITMQ_DEFAULT_USER=merUser -e RABBITMQ_DEFAULT_PASS=passwordMER -p 15672:15672 -p 5672:5672 rabbitmq:3-management-alpine
```

Build local `vidExtractor` image from source
```
docker build -t vidextractor:local .
```

Run local `vidExtractor` image
```
docker run -e TIME=10 -e USER=merUser -e PASS=passwordMER -e HOST=localhost -e MNG_PORT=15672 --net=host -v "Audios":"/vidExtractor/Audios" vidextractor:local
```

Run official `vidExtractor` image
```
docker run -e TIME=10 -e USER=merUser -e PASS=passwordMER -e HOST=localhost -e MNG_PORT=15672 --net=host -v "Audios":"/vidExtractor/Audios" merteam/vidextractor:latest
```

### Tests
Tests based on `mocha` that test the RabbitMQ connection and the download of one file