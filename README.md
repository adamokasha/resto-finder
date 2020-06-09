# Resto-Finder

A web service to find restaurant recommendations.

# Overview

Built with Node.Js and PostgreSQL. This service contains two sets of endpoints:

1. For creating and getting users.
2. For creating restaurants, getting recommendations based on a set of filters, updating, faving/unfaving and blacklisting/unblacklisting restaurants.

# Authentication

This web server is for demonstration purposes only. There exists no authentication layer.

# Getting Started

1. Create the env file and add the environment variables for postgres that are compatible for your machine.
2. Run `npm install` to install all dependencies.
3. Run `npm run start:dev` to run the web server.

# API Docs

The API doces can be found [here](https://web.postman.co/collections/5644120-03948db4-6696-4cf3-84c7-63aabcb60843?version=latest&workspace=e73fce6f-042e-4c96-894a-c08c49e9cb40)

# Entity Relationship Diagram

The ERD can be found [here](http://samokasha.com)

# ENV

Create a `.env` file at the project's root directory and add the following environment variables:

```
PG_HOST=
PG_USERNAME=
PG_PASSWORD=
PG_DATABASE=
PG_PORT=
```
