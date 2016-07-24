Detour - Microservices Kernel Overview
=====

Microservices based on HTTP.

Make requests against this kernel and it will route those requests
to registered handlers.  Handlers self-register (through a few
different ways) with a URL and a priority level.  Every request is
assigned a UUID to track it as it flows through the system.  The
HTTP protocol is used for the moment, as it has implementations in
every conceivable language.

A registered URL uses the following pieces:

Host: specifies the targeted service
Path: specifies the targeted resource or action
Headers: system metadata and request metadata

For example, a registeration might look like:

timing-log: `http://*/*@1000` : captures all requests at a high priority
error-capture: `http://*/*@900` : monitors all requests for errors
logging endpoint: `http://log/*@0` : captures all "log" requests at a normal priority

You may wish to configure an HTTP gateway that translates external
HTTP requests into internal ones.  "detour gateway" allows just
that, you configure it to route external hosts and paths to
internal applications, or use a default mapping that takes all
services configured with a hostname of the form `*.app` and map their
paths to external hosts (with the .app removed) and paths (whatever
path they advertise).

Requests go to the highest priority (highest value) service that
matches the request, expanding from the first slash.  The response
that this service gives is the one that is returned to the original
client.  To flow deeper into the system, the service must re-issue
the request (with any changes), with the same request ID, back to
the kernel.  The kernel keeps track of all open request IDs, and
when it receives a request that corresponds to an open request ID
(compared using an HTTP header) it starts that request just "after"
the service that received the request previously.

This allows us to have a high-level request flow for everything in the system.  Basic building blocks are services themselves.  This gives us tremendous power to keep the entire code base maintainable and understandable.  For example, two core features of any  architecture are logging and error handling.  We simply provide these as services themselves (living at, say `http://log/*` and `http://errors/*`).  We can also create higher-level services that act as middleware.  By registering a service with a glob host and a high priority, every (matching) flows through that service first, and then possibly elsewhere.

Application example
-----------

For example, we might create an `authenticate` service, which checks credentials for all external requests:

- Register `http://*/*@2000` -> analytics
- Register `http://*.app/*@1000` -> authenticate
- Register `http://*.app/*@900` -> authorize
- Register `http://myapp.com.app/*` -> myapp.com

Every request flows from top to bottom on its way to `myapp`, which therefore no longer needs to worry about authentication/authorization/analytics.  Each microservice does one job:

**analytics** - records all request start/finish data, keeping track of the performance of every request going through the system, and understanding the relationships between requests, which can reference "parent" requests.

**authenticate** - checks to see if the request is tied to a specific user, and if it is a valid request (and not for an old timed-out session).  It translates between an external authentication scheme (such as JWT, or cookies, or auth tokens) and an internal user scheme (X-Detour-User-Id HTTP Header) that is designed to be easy to work with, not secure (it's only used internal to the system!)

**authorize** - Checks to see if the user is actually allowed to do the thing that they are asking to do.  Depending on the use case, this may be checking against a DB, a rules list, or some other system.

**myapp.com** - Does the simple thing that we actually care about.  It might take a request for `/dashboard`, issue a few more sub-requests back to the system, say to `http://sql/myapp_db?query=SELECT...` and `http://redis/myapp_cache/dashboard`, and maybe `http://mailer/` (with the originating request in a header, so everything can be tracked)

Concrete Example
=====

HTTP Gateway Receives:
```
GET /dashboard
Host: myapp.com
Cookie: auth-token=blah
X-Detour-User-Id: 325
```
It first drops the X-Detour-* namespace, which is for internal use only.  It can also be configured to instantly 403 any request that contains entries in the X-Detour-* header namespace.  It creates a new request on the kernel:
```
GET /dashboard
Host: myapp.com.app
Cookie: auth-token=blah
X-Detour-Original-Host: myapp.com
X-Detour-External-Request-Id: <uuid1>
```
This is picked up by the analytics service (the first internal service):
```
GET /dashboard
Host: myapp.com.app
Cookie: auth-token=blah
X-Detour-Original-Host: myapp.com
X-Detour-Request-Id: <uuid2>
X-Detour-External-Request-Id: <uuid1>
```
Which sends this request into the kernel:
```
GET /dashboard
Host: myapp.com.app
Cookie: auth-token=blah
X-Detour-Start-Time: 2016-02-05T12:34.003Z
X-Detour-Original-Host: myapp.com
X-Detour-Request-Id: <uuid2>
X-Detour-External-Request-Id: <uuid1>
```
Which notices that request `<uuid2>` is already active in the system, at the analytics service, so it enters that request just below the analytics service, at the `authenticate` step, which receives the above request, and re-issues it with the following change:

```
GET /dashboard
Host: myapp.com.app
Cookie: auth-token=blah
X-Detour-Start-Time: 2016-02-05T12:34.003Z
X-Detour-Original-Host: myapp.com
X-Detour-Request-Id: <uuid2>
X-Detour-External-Request-Id: <uuid1>
X-Detour-User-Id: 425
```

The router now sees that the request is active at the `authenticate` step, so it sends it to the `authorize` step, which could determine that User 425 doesn't have `GET` access for `/dashboard`, and reject it, or it could return the request, unchanged, back into the system.  Now `myapp.com` is the target, executes the business logic for the given request, and returns the data through each of the above.  The `authorize` piece could inspect the response for integrity, the `analytics` could record data on how much data was sent back and how fast (TTFB, etc.).

The kernel supports special responses that simplify the creation of non-flow-through services.  You can respond with HTTP headers that announce common behaviors.  This simplifies the creation of many types of services that don't need deep interaction with the HTTP stream.  Responding without one of these headers (the default behavior) is "the response I am sending is the response to the request".  These non-default but supported behaviors are:

- `X-Detour-Add-Headers:` adds a URL-encoded, comma-separated set of headers to the request and continues the request down the pipeline
- `X-Detour-Remove-Headers:` removes headers specified by a URL-encoded, comma-separated list
- `X-Detour-Set-Priority:` restarts the request at a new priority level, allowing you to skip or repeat middleware steps.
- `X-Detour-Reroute-As:` changes the requested URL a new URL, with the old URL saved in X-Detour-Original-Path and X-Detour-Original-Host.

Implementations
=====

As a simple spec, one can implement Detour in any language.  We aim to create a reference implementation in Node.  We wish to support a few different ways to integrate modules that all communicate using the high-level concepts of HTTP, but we do not insist on the medium being in HTTP.  For example, it is conceivable that in an environment where low latency is crucial, one might wish to co-locate a few services in the same process as the router itself.  This is possible with Node by importing the reference implementation as a library instead of running it as a standalone process.  It provides hooks for registering internal components with a callback/method interface instead of an HTTP interface.  Of course, the whole point of this thing is to allow heterogenous language use, so this is designed to be an optimization that can be made only if absolutely necessary.  If you want to colocate everything, just write a normal node application!  The choice of kernel language determines the languages of co-located services.  It is also reasonable to define mappings for different communication strategies (websockets, unix sockets, SPDY, etc.)
