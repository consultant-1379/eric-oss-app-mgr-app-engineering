#!/usr/bin/env groovy
package pipeline

//def bob = "bob/bob -r \${WORKSPACE}/ci/src/main/rulesets/ruleset2.0.yaml"
def defaultBobImage = 'armdocker.rnd.ericsson.se/proj-adp-cicd-drop/bob.2.0:1.7.0-87'
def bob = new BobCommand()
        .bobImage(defaultBobImage)
        .envVars([
                HOME: '${HOME}',
                KUBECONFIG: '${KUBECONFIG}',
                AWS_CONFIG: '${AWS_CONFIG}',
                AWS_CREDENTIALS: '${AWS_CREDENTIALS}',
                NAMESPACE: '${NAMESPACE}',
                APPMGRURL: '${APPMGRURL}',
                DB_UPDATE: '${DB_UPDATE}',
                RAPP_STAGING: '${RAPP_STAGING}',
                AUTOAPP_ADDITIONAL_PARAMETER: '${AUTOAPP_ADDITIONAL_PARAMETER}',
                KEYCLOAK_URL: '${KEYCLOAK_URL}',
                APPMGR_USER: '${APPMGR_USER}',
                APPMGR_PASS: '${APPMGR_PASS}',
                BUILD_URL: '${BUILD_URL}'
        ])
        .needDockerSocket(true)
        .toString()

def RPT_API_URL = ""
def RPT_GUI_URL = ""

pipeline {
    agent {
        label "common_agents"
    }

    parameters {
        string(name: 'KUBECONFIG',
                description: 'Kubeconfig file')
        string(name: 'AWS_CREDENTIALS',
                defaultValue: 'autoapp_aws_credentials',
                description: 'AWS Shared credentials file')
        string(name: 'AWS_CONFIG',
                defaultValue: 'autoapp_aws_config',
                description: 'AWS config file')
        string(name: 'NAMESPACE',
                description: 'Namespace where the service is running on the cluster')
        string(name: 'APPMGRURL',
                defaultValue: 'https://app-mgr.hart906.rnd.gic.ericsson.se',
                description: 'Ingress hostname url of enviroment that request will be send at')
        booleanParam(name: 'DB_UPDATE',
                defaultValue: true,
                description: 'Clean and PreLoad App Mgr Database before test run')
        booleanParam(name: 'RAPP_STAGING',
                defaultValue: false,
                description: 'Enable if runs for rApp Staging Disabled for app staging tests')
        string(name: 'AUTOAPP_ADDITIONAL_PARAMETER_ID',
                defaultValue: 'eric-oss-5gcnr-additional-parameters-string',
                description: 'RAPP config file')
        string(name: 'KEYCLOAK_URL',
                defaultValue: 'https://keycloak-app-mgr.hart906.rnd.gic.ericsson.se',
                description: 'service mesh keycloak host url of environment that request will be send at')
    }

    options {
        timestamps ()
        ansiColor('xterm')
    }

    environment {
        AWS_HOME = "${env.WORKSPACE}/workdir/aws"
        KUBE_HOME = "${env.WORKSPACE}/.kube"
        KUBECONFIG = "${env.KUBE_HOME}/config"
        APPMGRURL = "${params.APPMGRURL}"
        DB_UPDATE = "${params.DB_UPDATE}"
        RAPP_STAGING = "${params.RAPP_STAGING}"
        AUTOAPP_ADDITIONAL_PARAMETER = credentials("${params.AUTOAPP_ADDITIONAL_PARAMETER_ID}")
        KEYCLOAK_URL = "${params.KEYCLOAK_URL}"
        CREDENTIALS_APPMGR_CREDENTIALS = credentials('APPMGR_CREDENTIALS')
        BUILD_URL = "${env.JOB_URL}${env.BUILD_ID}/"
    }

    stages {
        stage('Prepare') {
            steps {
                cleanWs()
                sh 'docker pull armdocker.rnd.ericsson.se/proj-eric-oss-dev-test/k6-reporting-tool-cli:latest'
            }
        }

        stage('Checkout') {
            steps {
                checkout([$class: 'GitSCM', branches: [[name: '*/master']], extensions: [[$class: 'CleanBeforeCheckout']], userRemoteConfigs: [[credentialsId: 'eoadm100-user-creds', url: 'https://gerrit.ericsson.se/OSS/com.ericsson.oss.appEngineering/eric-oss-app-mgr-app-engineering']]])
                sh "chmod +x -R ${env.WORKSPACE}"
            }
        }

        stage('Cleaning Git Repo') {
            steps {
                sh 'git clean -xdff'
                sh 'git submodule sync'
                sh 'git submodule update --init --recursive'
                sh 'ls -al'
            }
        }
        stage('Increase CLI default timeout'){
            steps{
                ansiColor('xterm') {
                    echo "Increasing K6 Report CLI Default timeout"
                    sh '''#!/bin/bash
                    shopt -s expand_aliases
                    source ~/.bashrc
                    set -x
                    alias testware-cli=$'docker run --rm -t -v `pwd`:`pwd` --user `id -u`:`id -g` armdocker.rnd.ericsson.se/proj-eric-oss-dev-test/k6-reporting-tool-cli:latest testware-cli'
                    testware-cli create-job --jenkins-url $BUILD_URL --timeout 4500
                    '''
                }
            }
        }

        stage('K6 Testing') {
            steps {
                script {
                    withCredentials([
                            usernamePassword(credentialsId: 'APPMGR_CREDENTIALS', usernameVariable: 'APPMGR_USER', passwordVariable: 'APPMGR_PASS'),
                            file(credentialsId: "${params.KUBECONFIG}", variable: 'KUBECONFIG_FILE'),
                            file(credentialsId: "${params.AWS_CREDENTIALS}", variable: 'AWS_SHARED_CREDENTIALS_FILE'),
                            file(credentialsId: "${params.AWS_CONFIG}", variable: 'AWS_CONFIG_FILE')
                    ]) {
                        sh """#!/bin/bash
                        |mkdir -p ${env.AWS_HOME} ${env.KUBE_HOME}
                        |cp $KUBECONFIG_FILE ${env.KUBECONFIG}
                        |cp $AWS_CONFIG_FILE ${env.AWS_HOME}/config
                        |cp $AWS_SHARED_CREDENTIALS_FILE ${env.AWS_HOME}/credentials""".stripMargin()
                        sh "${bob} update-pod deploy-testsuite"
                    }
                }
            }
        }

        stage('Get RPT API URL') {
            steps {
                ansiColor('xterm') {
                   script {
                        RPT_GUI_URL = sh(script: "kubectl get secrets/testware-resources-secret --template={{.data.gui_url}} -n ${NAMESPACE} | base64 -d",
                                            returnStdout: true).trim()
                        RPT_API_URL = sh(script: "kubectl get secrets/testware-resources-secret --template={{.data.api_url}} -n ${NAMESPACE} | base64 -d",
                                            returnStdout: true).trim()
                        def TESTWARE_CLI = "docker run --rm -t -v `pwd`:`pwd`  -e RPT_API_URL=" + RPT_API_URL + " -e RPT_GUI_URL=" + RPT_GUI_URL +
                                  " --user `id -u`:`id -g` armdocker.rnd.ericsson.se/proj-eric-oss-dev-test/k6-reporting-tool-cli:latest testware-cli"
                        env.testware_cli = TESTWARE_CLI
                    }
                }
            }
        }

        stage('Monitor K6 Testware status') {
            steps {
                ansiColor('xterm') {
                   script {
                        echo "Monitor K6 Testware status"
                        sh """#!/bin/bash
                        shopt -s expand_aliases
                        source ~/.bashrc
                        set -x
                        ${env.testware_cli} wait-testware --url $BUILD_URL  --path `pwd` --delay 60 --retries 75
                        """
                    }
                }
            }
        }

        stage('Copy K6 Pod Logs and summary.json file') {
            steps {
                ansiColor('xterm') {
                    script {
                        sh '''#!/bin/bash
                        shopt -s expand_aliases
                        source ~/.bashrc
                        set -x
                        kubectl get pods -n $NAMESPACE | grep app-mgr-k6-testsuite
                        ls -al
                        id=$(grep id execution-status.properties | cut -c4-)
                        echo $id
                        ${env.testware_cli} download-log --id $id --type k6 --path `pwd`
                        ${env.testware_cli} download-log --id $id --type summary --path `pwd`
                        echo "K6 testing completed and download log"
                        '''
                    }
                }
            }
        }

        stage('Copy Report') {
            steps {
                ansiColor('xterm') {
                    sh "${bob} copy-testsuite-report"
                }
            }
        }

        stage('Expose K6 Testware Status') {
            steps {
                ansiColor('xterm') {
                    script {
                        try{
                            def testVersion
                            testVersion = sh(script: "kubectl --kubeconfig=${env.KUBECONFIG} -n ${env.NAMESPACE} exec app-mgr-k6-testsuite -- printenv TEST_VERSION", returnStdout: true).trim()
                            def passed = 'not available'
                            if ( fileExists('execution-status.properties') ) {
                                def props = readProperties  file: 'execution-status.properties'
                                passed = props['passed']
                            }
                            sh """
                                echo 'status=${passed}' > artifact.properties
                                echo 'jobDetailsUrl=${BUILD_URL}' >> artifact.properties
                                echo 'testVersion=${testVersion}' >> artifact.properties
                            """
                        } catch (err) {
                            echo "Error during exposing K6 testwre status."
                            echo err.getMessage()
                        }
                    }
                }
            }
        }

        stage('Archive artifact properties file') {
            steps {
                ansiColor('xterm') {
                    script {
                        try{
                            if ( fileExists('artifact.properties') ) {
                                archiveArtifacts artifacts: 'artifact.properties', onlyIfSuccessful: true
                            }
                        }catch (err) {
                            echo "WARNING: Something went wrong during archiving artifact.properties."
                            echo err.getMessage()
                            echo "This did not fail the pipeline!"
                        }
                    }
                }
            }
        }

        stage('Verify Results') {
            steps {
                ansiColor('xterm') {
                    sh "${bob} verify-results"
                }
            }
        }

        stage('K6 Test Status') {
            steps {
                echo "Getting Test execution status"
                getBuildStatus()
            }
        }
    }

    post {
        always {
            script {
                withCredentials( [
                    file(credentialsId: "${params.KUBECONFIG}", variable: 'KUBECONFIG_FILE'),
                    file(credentialsId: "${params.AWS_CREDENTIALS}", variable: 'AWS_SHARED_CREDENTIALS_FILE'),
                    file(credentialsId: "${params.AWS_CONFIG}", variable: 'AWS_CONFIG_FILE')]) {
                        sh "./ci/scripts/ADP_logs.sh ${env.NAMESPACE}"
                }
            }
            archiveArtifacts 'summary.json'
            archiveArtifacts '*.log'
            archiveArtifacts  artifacts: 'K6_Test_Report.html', allowEmptyArchive: true
            archiveArtifacts artifacts: 'logs_*.tgz, logs/*', allowEmptyArchive: true
            publishHTML([allowMissing: true,
                alwaysLinkToLastBuild: true,
                keepAll: true,
                reportDir: '',
                reportFiles: 'K6_Test_Report.html',
                reportName: 'K6_Test_Report_html',
                reportTitles: ''])
            script {
                try{
                    sh "./ci/scripts/cleanupJobs.sh ${env.KUBECONFIG} ${env.NAMESPACE}"
                } catch (err) {
                    echo "WARNING: Something went wrong during hanging jobs cleanup."
                    echo err.getMessage()
                    echo "This did not fail the pipeline!"
                }
            }
            cleanWs()
        }
     }
}

def getBuildStatus() {
    if ( !fileExists('execution-status.properties') ) {
        error("execution-status.properties file not found")
    }
    def props = readProperties  file: 'execution-status.properties'
    if (props['passed'] == 'False') {
        error('Testware Failed: ' + props['failureReason'])
    }
    currentBuild.description = "<a href=\""+ props["reportLink"] +"\">Testware Report</a>"
}

// More about @Builder: http://mrhaki.blogspot.com/2014/05/groovy-goodness-use-builder-ast.html
import groovy.transform.builder.Builder
import groovy.transform.builder.SimpleStrategy

@Builder(builderStrategy = SimpleStrategy, prefix = '')
class BobCommand {
    def bobImage = 'bob.2.0:latest'
    def envVars = [:]
    def needDockerSocket = false

    String toString() {
        def env = envVars
                .collect({ entry -> "-e ${entry.key}=\"${entry.value}\"" })
                .join(' ')

        def cmd = """echo \"\\\"\$STAGE_NAME\\\" `date '+%s'`\" >> .stages;
            |docker run
            |--init
            |--rm
            |--workdir \${PWD}
            |--user \$(id -u):\$(id -g)
            |-v \${PWD}:\${PWD}
            |-v \${HOME}/.docker:\${HOME}/.docker
            |${needDockerSocket ? '-v /var/run/docker.sock:/var/run/docker.sock' : ''}
            |${env}
            |\$(for group in \$(id -G); do printf ' --group-add %s' "\$group"; done)
            |--group-add \$(stat -c '%g' /var/run/docker.sock)
            |${bobImage}
            |-r ./ci/pipeline/rulesets/ruleset2.0.yaml
            |"""
        return cmd
                .stripMargin()           // remove indentation
                .replace('\n', ' ')      // join lines
                .replaceAll(/[ ]+/, ' ') // replace multiple spaces by one
    }
}
