# App Manager Application Staging Tests

## Jenkins Jobs


* [Pre Code Review](https://fem1s11-eiffel216.eiffel.gic.ericsson.se:8443/jenkins/job/eric-oss-app-mgr-app-engineering_PreCodeReview/)
* [Publish](https://fem1s11-eiffel216.eiffel.gic.ericsson.se:8443/jenkins/job/eric-oss-app-mgr-app-engineering_Publish/)

## Required Variables

To run this testware the following environment variables are required

| Variable Name | Path on Values.yaml | Description                    | Sample Value           |
|---------------|---------------------|--------------------------------|------------------------|
| hostname_url  | env.hostname_url    | Hostname URL for the endpoints | http://localhost:8080/ |

## Running the testware

Run the following command to build the image and execute testware:

````shell
./gradlew run
````

````shell
 ./gradlew deploy
````
