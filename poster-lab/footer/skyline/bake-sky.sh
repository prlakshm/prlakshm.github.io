#!/bin/zsh
# bake one of her painted-sky versions with the full treatment and export it
# usage: ./bake-sky.sh <tag> <crop row> <site name> [grade]
set -e
TAG=$1; CROP=$2; NAME=$3; GRADE=${4:-lift:0.78:0.45:0.4:0.25}
SRC=$TAG python3 base.py 0 578 | tail -1
python3 paint.py source $GRADE own-full light own | tail -1
python3 lilygold.py own-full lg-hand3d hand+3d
cp lg-hand3d.png sky-$TAG.png; for s in -gold.npy -cloud.npy -cloud-rgb.npy -matte.npy; do cp lg-hand3d$s sky-$TAG$s; done
python3 export.py sky-$TAG $NAME $CROP 578
