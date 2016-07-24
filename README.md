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


