pipeline {
    agent any

    stages {

        stage('Checkout') {
            steps {
                echo 'Checking out ELMS source code...'
                checkout scm
            }
        }

        stage('Build') {
            steps {
                echo 'Installing project dependencies...'
                bat 'npm install'
            }
        }

        stage('Test') {
            steps {
                echo 'Running ELMS tests...'
                bat 'npm test -- --runInBand'
            }
        }

        stage('Result') {
            steps {
                echo 'ELMS CI Pipeline completed successfully.'
            }
        }
    }
}