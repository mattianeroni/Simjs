## Simjs
A library for discrete events simulation in JavaScript (Node.js) and inspired by Simpy (Python).

### Features

Simjs is the general-purpose simulation library which includes the simulation environment, resources and many others building blocks.

###### Environment
In order to run the simulation an environment need to be created. It also need to be run with specific command explained below.
The environment handles the simulation clock and the syncronization of processes.

###### Process
Every action in the simulation must be written as a process.
Every gneerator can be used as a process.
Simjs has been designed to deal with multi-processing and parallelism.

###### Timeout
A timeout is a particular process which cause a delay.

###### Resources
Simjs provides an extendible class called Resource. Every resource can manage a queue of requests. Users can deal with resources by using commends "request" and "release" exactly as in Simpy.


### Examples

#### Example 0. Simjs implementation basics


```javascript
const simjs = require('./simjs.js');


function* example_process (env, delay, message='') {
    yield env.timeout(delay);
    console.log(env.now, " - ", message);
}

function* main_process (env) {

    yield env.process(example_process(env, 10, "first process end"));
    sp = env.process(example_process(env, 10, "second process end"));
    yield env.process(example_process(env, 5, "third process end"));
    yield sp
    console.log(env.now, " - simulation end");
}

let env = simjs.Environment();
env.process(main_process(env));
env.run();

/* 	OUTPUT:
10.0 - first process end
15.0 - third process end
20.0 - second process end
20.0 - simulation end
*/
```
***

#### Example 1. Easy resource implementation


```javascript
const simjs = require('./simjs.js');


function* releaser (env, delay, req=null) {
    yield env.timeout(delay);
    req.release();
    console.log(env.now, " - resource released");
}

function* main_process (env) {
    let res = simjs.Resource(env);
    let req = res.request();
    env.process(releaser(env, 10, req));
    yield env.timeout(5);
    yield req;
    console.log(env.now, " - simulation end");
}

let env = simjs.Environment();
env.process(main_process(env));
env.run();

/* 	OUTPUT:
10.0 - resource released
10.0 - simulation end
*/
```
***
