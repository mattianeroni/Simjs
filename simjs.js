/*
Simjs is a simulation library, maybe not the best, maybe not the most popular, maybe 
not the most performant, but it is a simulation library.
For the moment it has no graphical support, but it is supposed to work, and, one day, 
maybe it will have.

Written by Mattia Neroni 2019.

*/




class Event {
	// Everything happening in the simulation can be represented as an Event
	constructor (env, delay=0, generator=null) {
		// Initialize.
		// :param env: The Environment the Event belongs to
		// :param delay: The duration of the event and the delay it generates 
		//               in the Environment simulation clock.
		// :param generator: The generator (i.e. process of the simulation triggered by the
		//                   event when it takes place.
		// :attr callbacks: The list of callbacks. The callbacks are generators (i.e. processes)
		//                  that restart once the current process is concluded.
		this.env = env;
		this.delay = delay;
		this.generator = generator;
		this.callbacks = [];
	}
}







class Timeout extends Event {
	// The timeout is an event which does not trigger any other event.
	// It just cause a delay in the simulation clock.
	
	constructor (env, delay){
		// Initialize.
		// :param env: The Environmant it belongs to
		// :param delay: The delay it generates in the simulation clock of
		//               the Environment.
		// Once generated, it schedule itself in the list of events of the 
		// Environment (this is in my opinion very twisted, but in the Simpy
		// code it is made like this, and I wanted to keep it).
		// Since the Timeout is an Event, and the Events require a generator,
		// the generator of the Timeout is a function that does nothing.		
		super(
			env,
			delay,
			(function* () {})()
			);
		env.schedule(this, 1, delay);
	}
}








class Process extends Event {
	// The Process is the most powerfull Event.
	// Its generator is a process in the simulation, and it can do things
	// and trigger other processes as well.
	
	constructor (env, generator) {
		// Initialize.
		// :param env: The Environment the Process belongs to.
		// :param generator: The simulation process.
		// Once generated, it schedule itself in the list of events of the 
		// Environment (this is in my opinion very twisted, but in the Simpy
		// code it is made like this, and I wanted to keep it).
		super(env, 0, generator);
		env.schedule(this);
	}
	

	resume () {
		// Every time a process is resumed it does a step.
		// and the step is made calling the next() function of its generator.
		let resp = this.generator.next();
		
		// Once step-by-step the things the process can do are
		// finished, its callbacks are triggered.
		// Otherwise, the current process in included in the callbacks 
		// of the process that stops it.
		if (resp.done) {
			if (this.callbacks.length > 0) {
				this.callbacks.forEach(i=>i.resume());
			}
		} else {
			resp.value.callbacks.push(this);
		}
	}
}




class Request extends Event {
	// A request is an event that is automatically triggered
	// when the interested resource takes care of it and release it.
	constructor(env, resource) {
		// Initialize.
		// :param env: The Environment
		// :param resource: The resource required.
		//
		// As for the timeout it is initialised as an Event which does
		// nothig.
		// However, it is not scheduled until the resource release it.
		super(env, 0, (function* () {})());
		this.resource = resource;
	}

	release () {
		// When the request is released an event is scheduled in the Environment.
		// Until that moment the request is pending, and only the interested resource 
		// knows about it.
		// Once released it is also removed by the queue of the resource.
		this.resource.queue.splice(this.resource.queue.indexOf(this), 1);
		this.env.schedule(this);
	}
}





function Resource (env, capacity=1) {
	// The resource represent a resource in the simulation
	// e.g. machine, person, employee, computer, consumable, and so on.
	//
	//Initialize.
	// :param env: The Environment.
	// :param capacity: The number of request the resource 
	//                  can handle at the same time.
	// :attr queue: The queue of requests.
	this.env = env;
	this.capacity = capacity;
	this.queue = [];

	
	this.request = function () {
		// When the Resource is required, a request is generated
		// and appended to the queue of requests.
		// The request is also returned to the user so that he/she
		// can handle it (and require it release!).
		let req = new Request(this.env, this);
		this.queue.push(req);
		return req;
	}

	
	this.release = function (req) {
		// A Resource can also be used to release a request.
		// But, in this case, the request must be provided.
		// A faster method to do this (which does not exist in SimPy)
		// has been appended, giving the method 'release' directly to the 
		// Request class.
		//
		// When a request is released, it is appended to the list of events of
		// the Environment, because that is the real instant when the Event (i.e. 
		// Request) is triggered.
		//
		// :param req: The request to release.
		this.queue.splice(this.queue.indexOf(req), 1);
		this.env.schedule(req);
	}
}



class Environment {
	// This is the main class of the library, and it handles
	// all the events and all the simulation.
	
	/*
	A QUICK OVERVIEW OF HOW THE ENVIRONMENT WORKS
	
	While the user calls new timeouts, processes and requests, nothing happens
	inside the Environment.
	The only method called is the 'schedule', which just organize and schedule
	all the events and their callbacks.
	
	Once the creation of events is concluded, the user is required to call
	the method 'run' to execute the simulation. And it is at that time that 
	the Environment starts triggering all the events and the simulation is computed.
	
	*/
	
	constructor() {
		// Initialize.
		// :attr now: The current simulation time.
		// :attr queue: The queue of events.
		this.now = 0;
		this.queue = [];
	}

	
	
	timeout(delay) {
		// This method generates a Timeout and return it to the user.
		// :param delay: The delay of the timeout.
		return new Timeout(this, delay);
	}
	
	

	process (generator) {
		// This method generates a Process and returns it to the user.
		// :param generator: The generator function that represents the 
		//                   process.
		return new Process(this, generator);
	}
	
	

	step () {
		// This method trggers the first event in queue.
		// It sets the clock time equal to that one desired by
		// the event.
		// If the event is conclued all its callbacks are called
		// and triggered.
		// Then the event is removed from the queue.
		this.now = this.queue[0][0];
		let event = this.queue[0][2];
		let resp = event.generator.next();
		if (resp.done) {
			if (event.callbacks.length > 0) {
				event.callbacks.forEach(i=>i.resume());
			}
		} else {
			resp.value.callbacks.push(event);
		}
		this.queue.splice(this.queue[0], 1);
	}
	
	

	run () {
		// This is the main procedure of the Environment.
		// One-by-one all the steps are executed until the simulation is
		// concluded.
		while (this.queue.length > 0) {
			this.step();
		}
	}
	
	
	

	schedule (event, priority=1, delay=0) {
		// This is the method that schedule the Events which are taking
		// place during the simulation.
		//
		// :param event: The event to schedule.
		// :param priority: The priority idex assigned to that event.
		//                  Lower is the priority value, the greater is 
		//                  the priority given to the event.
		// :param delay: The delay that event cause to the Environment clock.
		if (this.queue.length == 0) {
			this.queue.push([this.now + delay, priority, event])
		} else {
			if ((this.queue[this.queue.length - 1][0] < this.now + delay) || (this.queue[this.queue.length-1][1] >= priority && this.queue[this.queue.length-1][0] == this.now + delay)){
				this.queue.push([this.now + delay, priority, event]);
			} else {
				for (const e of this.queue) {
					if ((e[1] < priority && e[0] == this.now + delay) || (e[0] > this.now + delay)) {
						this.queue.splice(this.queue.indexOf(e), 0, [this.now + delay, priority, event]);
						break;
					}
				}
			}
		}
	}
}





// Export the Environment and the Resource
// For safety reasons other elements are not exported, but
// they can be created intervening on the Environment
module.exports = {
	Environment : Environment,
	Resource : Resource
}
