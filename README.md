[![Code Smells](https://sonarcloud.io/api/project_badges/measure?project=devsyncremote_Backend&metric=code_smells&token=7b4798c2782e2cb158dcd3314b400037fdd2968d)](https://sonarcloud.io/summary/new_code?id=devsyncremote_Backend)
[![Bugs](https://sonarcloud.io/api/project_badges/measure?project=devsyncremote_Backend&metric=bugs&token=7b4798c2782e2cb158dcd3314b400037fdd2968d)](https://sonarcloud.io/summary/new_code?id=devsyncremote_Backend)
[![Security Rating](https://sonarcloud.io/api/project_badges/measure?project=devsyncremote_Backend&metric=security_rating&token=7b4798c2782e2cb158dcd3314b400037fdd2968d)](https://sonarcloud.io/summary/new_code?id=devsyncremote_Backend)
[![Technical Debt](https://sonarcloud.io/api/project_badges/measure?project=devsyncremote_Backend&metric=sqale_index&token=7b4798c2782e2cb158dcd3314b400037fdd2968d)](https://sonarcloud.io/summary/new_code?id=devsyncremote_Backend)

# Syncremote Backend Repo

## Ec2 instance configuration where this repo is executed:
* Update and upgrade
  1. `sudo yum update`
  2. `sudo yum upgrade`
* Install docker with docker-compose plugin
  1. `sudo yum install docker -y`
  2. `sudo service docker start`
* Create non-sudo user: worker
  1. `sudo useradd -m worker`
  2. `sudo passwd worker` (workerworker as password, password authentication is disabled by default)
  3. `sudo usermod -aG docker worker`
  4. `sudo usermod -aG docker ec2-user`
  4. `su worker`
  5. `cd /home/worker`
  6. `mkdir app`
* Create ssh keys
  1. `ssh-keygen -b 4096`
  2. `mv /home/worker/.ssh/id_rsa.pub /home/worker/.ssh/authorized_keys`
  3. `Copy private key to github action for deployment`
