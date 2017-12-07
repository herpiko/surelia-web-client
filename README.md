
## REQUIREMENT

- Node v4.x
- If deployed behind a NGINX server, it needs  NGINX version > 1.3.

## INSTALLATION

```
npm install
```


## HOWTO

To run a monitored service:

```
npm run server
```

To run a single service and wait forever:

```
npm run single
```

To install bower dependencies:

```
npm run bower
```

To build UI

```
npm run build
```

To do unit testing

```
npm run test
```

To restart a monitored service

```
npm run restart
```

To stop a monitored service

```
npm run stop
```

To kill daemon

```
npm run kill
```

Environment variable examples

```
DB_HOST=user:password@localhost DB=surelia PORT=3001 GEARMAN=192.168.1.1 NODE_TLS_REJECT_UNAUTHORIZED=0
```

