if [ -d node_modules/hapi-io ];then
  (cd node_modules && cd hapi-io && ../../scripts/install-plugin hapi-io 00-hapi-io)
fi
