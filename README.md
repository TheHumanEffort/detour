# detour

The Composable Web App Router

## A Quick Justification

Why another web application framework (WAF)?  We are aiming to solve a different problem than any other WAF - we are trying to simplify the long-term evolution of web applications.  Currently, there exist many successful frameworks that aim to make application development quick, painless, and easy.  We think they suffer from three major problems when it comes to long-term service:

1. They have huge API surface areas that are highly prone to changes (Ruby, do you really need to change core method names?)

2. They do not play nicely across language boundaries, hence translating a Ruby library (sass) into C, then making bindings for it in every conceivable language.  Without a big team, this is basically impossible.

3. They do not compose well

We want to build a platform and language agnostic system for composing web applications.  What does composition mean?  Let's use an example to illustrate:  I have written a simple prototype app as a Single Page Application in Angular (i.e. a static site from an HTTP perspective), backed by a Rails API endpoint.  I love it, and I want to ship it.  I need to add a few things before all is said and done - I need to add a User and account management, billing, etc.  There are a ton of tools for Rails that let me do this easily - but in order for the Angular app to benefit from, say, an easy devise-based login mechanism, I need to embed it in the rails API app, which will complicate the rails API.  I can't just wrap (compose!) the whole angular-and-api app inside of another application easily.  Further, if I have another app in the future that needs user-and-account-management, I can't use the same composable component there.

We can fix this!  By creating a generic router and reusable components, we can make this example work!  We simply state a few rules, i.e. pass requests through the gateway component, then to the api or app, depending on the path.  The reusable component has a trivial API surface, it takes requests, if they aren't authenticated, it presents UI to log them in, if they are, it passes them through to the internal applications, which now get a handy HTTP header announcing the user ID, roles, and email.

Now time goes by and we want to add Facebook support, we can add it as trivially as adding it to our authentication wrapper, we don't have to modify any of the internal apps at all!

All this, and we never leave the host that the user expects.

## Description

Detour is a set of conventions around composing HTTP applications.  The conventions have to do with how responses are routed.  We also have a simple configuration file format that is likely to expand over time.  We also have a working implementation in Node.  If you want to write your own routers, configuration systems, we welcome feedback.  Once we have a good sense of the features that are required, and the right ways to build things, we'll come up with an RFC around the header names, conventions, etc.  Security is a big concern, so we want to make sure that the fundamentals are good before we go too crazy.

Our configuration file looks like this:

```
# statistics *://*/*

authenticate:3000 *://*/*

# authorize *://*/*

localtest *://192.168.99.100:*/*
orienteer-api *://api.orienteer.io/api/*
orienteer-api *://www.orienteer.io/api/*
orienteer-api *://orienteer.io/api/*
```

Comment lines start with `#`, routing lines have an internal host/port, and a host/path glob.  Requests "flow" from top to bottom, and are sent to matching hosts, and non-matching hosts/services are skipped.  At every step, the following happens:

1. If the service has any non-2** response, it is sent to the user (except 404, which signals "continue unchanged")
2. If the service has a 2** response, it has the option of responding to the user, or allowing the request to continue flowing, optionally adding/removing headers, or changing the path, body, etc.  (support not complete here yet).

## WIP

This is a work in progress!  For now, the testbed only has one "microservice", an authentication gateway.  We'll be spinning up more as we build stuff out.

1) The current example can be run using `docker-compose up`, and then point your browser to your docker host, port 3007.  You will notice a standard devise login/signup mechanism, followed by a Docker Cloud "hello world" page once you've been authenticated.

