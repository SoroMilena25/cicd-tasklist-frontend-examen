// Prérequis Jenkins (à configurer une seule fois, cf. Manage Jenkins) :
//   - Outil "SonarScanner" declare dans Manage Jenkins > Tools > SonarQube Scanner installations
//   - Serveur "SonarQube" declare dans Manage Jenkins > System > SonarQube servers
//   - Credential "dockerhub-credentials" (Username with password = token) dans Jenkins Credentials
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
                withSonarQubeEnv('SonarQube') {
                    sh "${tool 'SonarScanner'}/bin/sonar-scanner"
                }
            }
        }

        stage('Quality Gate') {
            steps {
                timeout(time: 5, unit: 'MINUTES') {
                    waitForQualityGate abortPipeline: true
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
                withCredentials([usernamePassword(credentialsId: 'dockerhub-credentials', usernameVariable: 'DOCKERHUB_USER', passwordVariable: 'DOCKERHUB_TOKEN')]) {
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
