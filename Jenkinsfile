pipeline {
    agent any
    
    environment {
        // Prepare Docker Image Name
        DOCKER_IMAGE = "ai-dubbing-app:${env.BUILD_ID}"
    }
    
    stages {
        stage('Checkout') {
            steps {
                checkout scm
            }
            // Pull the latest commit from the chosen branch in Github
            post {
                success {
                    echo 'Successfully checked out branch'
                }
            }
        }
        
        stage('Lint & Config Check') {
            steps {
                // Ensure proper node modules exist for linting
                sh 'npm install'
                sh 'npm run lint'
            }
        }
        
        stage('Build Docker Image') {
            steps {
                sh "docker build -t ${DOCKER_IMAGE} ."
            }
        }
        
        stage('Push to Registry') {
            steps {
                echo 'Skipping registry push in this local staging example...'
                // sh "docker tag ${DOCKER_IMAGE} my-registry.com/ai-dubbing-app:latest"
                // sh "docker push my-registry.com/ai-dubbing-app:latest"
            }
        }
        
        stage('Deploy to EC2 GPU Instance') {
            steps {
                // Connects to EC2 using Jenkins credentials plugin
                // It will kill existing, run new docker image mapping to port 80
                // In future, this instance would have the proper proprietary NVIDIA runtime
                sshagent(['ec2-deploy-key']) {
                    sh """
                        ssh -o StrictHostKeyChecking=no ubuntu@\${EC2_HOST} 'docker stop ai-dubbing || true && docker rm ai-dubbing || true && docker run -d -p 80:3000 --name ai-dubbing ${DOCKER_IMAGE}'
                    """
                }
            }
        }
    }
    
    post {
        always {
            cleanWs()
        }
        success {
            echo "CI/CD Pipeline: Deployment Succeeded!"
        }
        failure {
            echo "CI/CD Pipeline: Deployment Failed! Investigate Jenkins console logs."
        }
    }
}
