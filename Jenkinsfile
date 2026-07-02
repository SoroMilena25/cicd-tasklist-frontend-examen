// Prérequis Jenkins (instance partagée, config déjà en place cote ecole) :
//   - Outil "SonarScanner" declare dans Manage Jenkins > Tools > SonarQube Scanner installations
//   - Serveur "sonarqube-server-1" declare dans Manage Jenkins > System > SonarQube servers
//   - Credential "milena-dockerhub-credentials" (Username with password = token Docker Hub)
//   - Credential "milena-sonarqube-token" (Secret text = token personnel SonarQube, requis
//     car le token du serveur partage n'a pas le droit de creer un nouveau projet)
//   - Agent avec node, npm, docker et trivy disponibles sur le PATH

pipeline {
    agent any

    environment {
        DOCKERHUB_NAMESPACE = 'soromilena25'
        IMAGE_NAME           = 'tasklist-frontend'
        FULL_IMAGE            = "${DOCKERHUB_NAMESPACE}/${IMAGE_NAME}:${env.BUILD_NUMBER}"
        LATEST_IMAGE           = "${DOCKERHUB_NAMESPACE}/${IMAGE_NAME}:latest"
    }

    options {
        timestamps()
        disableConcurrentBuilds()
    }

    stages {
        stage('Checkout') {
            steps {
                checkout scm
            }
        }

        stage('Install dependencies') {
            steps {
                sh 'npm ci'
            }
        }

        stage('Test') {
            steps {
                sh 'npm run test:coverage'
            }
            post {
                always {
                    junit 'reports/junit.xml'
                    archiveArtifacts artifacts: 'coverage/**', allowEmptyArchive: true
                }
            }
        }

        stage('Build') {
            steps {
                sh 'npm run build'
            }
        }

        stage('SonarQube Analysis') {
            steps {
                withSonarQubeEnv('sonarqube-server-1') {
                    withCredentials([string(credentialsId: 'milena-sonarqube-token', variable: 'SONAR_TOKEN')]) {
                        sh "${tool 'SonarScanner'}/bin/sonar-scanner -Dsonar.token=\$SONAR_TOKEN"
                    }
                }
            }
        }

        stage('Quality Gate') {
            steps {
                // Polling manuel de l'API SonarQube plutot que waitForQualityGate :
                // Jenkins tourne en local (localhost), le serveur SonarQube distant
                // ne peut donc pas lui envoyer de webhook de notification. On
                // interroge nous-memes l'API avec un intervalle maitrise (5s).
                withCredentials([string(credentialsId: 'milena-sonarqube-token', variable: 'SONAR_TOKEN')]) {
                    sh '''
                        set -e
                        REPORT_FILE=".scannerwork/report-task.txt"
                        CE_TASK_URL=$(grep '^ceTaskUrl=' "$REPORT_FILE" | cut -d'=' -f2-)
                        SERVER_URL=$(grep '^serverUrl=' "$REPORT_FILE" | cut -d'=' -f2-)

                        echo "Polling Compute Engine task: $CE_TASK_URL"
                        STATUS="PENDING"
                        for i in $(seq 1 120); do
                            RESPONSE=$(curl -s -u "$SONAR_TOKEN:" "$CE_TASK_URL")
                            STATUS=$(echo "$RESPONSE" | jq -r '.task.status')
                            echo "  [$i] Compute Engine task status: $STATUS"
                            if [ "$STATUS" = "SUCCESS" ] || [ "$STATUS" = "FAILED" ] || [ "$STATUS" = "CANCELED" ]; then
                                break
                            fi
                            sleep 5
                        done

                        if [ "$STATUS" != "SUCCESS" ]; then
                            echo "Le traitement de l'analyse a echoue (status=$STATUS)"
                            exit 1
                        fi

                        ANALYSIS_ID=$(echo "$RESPONSE" | jq -r '.task.analysisId')
                        QG_RESPONSE=$(curl -s -u "$SONAR_TOKEN:" "${SERVER_URL}/api/qualitygates/project_status?analysisId=${ANALYSIS_ID}")
                        QG_STATUS=$(echo "$QG_RESPONSE" | jq -r '.projectStatus.status')
                        echo "Quality Gate status: $QG_STATUS"

                        if [ "$QG_STATUS" != "OK" ]; then
                            echo "Quality Gate en echec"
                            exit 1
                        fi
                    '''
                }
            }
        }

        stage('Docker Build') {
            steps {
                sh "docker build -t ${FULL_IMAGE} -t ${LATEST_IMAGE} ."
            }
        }

        stage('Trivy Scan') {
            steps {
                sh """
                    trivy image --severity HIGH,CRITICAL --exit-code 0 --format table -o trivy-report.txt ${FULL_IMAGE}
                    trivy image --format spdx-json -o sbom-spdx.json ${FULL_IMAGE}
                """
            }
            post {
                always {
                    archiveArtifacts artifacts: 'trivy-report.txt,sbom-spdx.json', allowEmptyArchive: true
                }
            }
        }

        stage('Docker Push') {
            steps {
                withCredentials([usernamePassword(credentialsId: 'milena-dockerhub-credentials', usernameVariable: 'DOCKERHUB_USER', passwordVariable: 'DOCKERHUB_TOKEN')]) {
                    sh '''
                        echo "$DOCKERHUB_TOKEN" | docker login -u "$DOCKERHUB_USER" --password-stdin
                        docker push ${FULL_IMAGE}
                        docker push ${LATEST_IMAGE}
                        docker logout
                    '''
                }
            }
        }
    }

    post {
        always {
            sh "docker rmi ${FULL_IMAGE} ${LATEST_IMAGE} || true"
        }
    }
}
