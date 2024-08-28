#!/bin/bash -x

# Script to locally generate CSARs
# prerequisits:
#
# script should be located within directory where eric-oss-5gcnr-1.0.177-1.csar is
# docker installed
# change c<2 to number how many CSARs wanted to be built

declare -i i=177
for (( c=0; c<18; c++ ))
do
  unzip eric-oss-5gcnr-1.0.177-1.csar -d ./csarBuild
  ((i++))
  echo "$i"
  sed -i "s#1.0.177-1#1.0.$i-1#g" ./csarBuild/Definitions/AppDescriptor.yaml
  sed -i "s#177#$i#g" ./csarBuild/Definitions/AppDescriptor.yaml
  sed -i "s#177#$i#g" ./csarBuild/OtherDefinitions/ASD/ASD.yaml

  tar zxvf ./csarBuild/OtherDefinitions/ASD/eric-oss-5gcnr-1.0.177-1.tgz
  sed -i "s#177#$i#g" ./eric-oss-5gcnr/Chart.yaml
  sed -i "s#177#$i#g" ./eric-oss-5gcnr/eric-product-info.yaml

  rm ./csarBuild/OtherDefinitions/ASD/eric-oss-5gcnr-1.0.177-1.tgz
  tar -cvzf eric-oss-5gcnr-1.0.$i-1.tgz eric-oss-5gcnr/
  mv eric-oss-5gcnr-1.0.$i-1.tgz ./csarBuild/OtherDefinitions/ASD/eric-oss-5gcnr-1.0.$i-1.tgz

  docker load -i ./csarBuild/OtherDefinitions/ASD/Images/docker.tar
  docker tag proj-eric-oss-drop/eric-oss-5gcnr:1.0.177-1 proj-eric-oss-drop/eric-oss-5gcnr:1.0.$i-1
  docker save -o ./csarBuild/OtherDefinitions/ASD/Images/docker.tar proj-eric-oss-drop/eric-oss-5gcnr:1.0.$i-1
  cd csarBuild && zip -r eric-oss-5gcnr-1.0.$i-1.csar .
  mv eric-oss-5gcnr-1.0.$i-1.csar ../eric-oss-5gcnr-1.0.$i-1.csar
  cd ..
  ls -al
  rm -rf csarBuild/ eric-oss-5gcnr
done