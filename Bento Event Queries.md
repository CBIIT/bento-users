## Bento Event Queries
### Introduction
This document contains Cypher formatted queries that can be used to retrieve logged Bento events from a Neo4j database. Each entry in the **Queries** section below will contain a description, a list of required parameters, and the associated Cypher command. 
### Parameter Declaration
The format of the Cypher command below can be used to define parameters before running a query.

```
:params {
	"stringParameterName1": "String Value 1",
	"stringParameterName2": "String Value 2",
	"integerParameterName": 1000
}
```
Example:
```
:params {
	"email": "user@email.com",
	"IDP": "Test-IDP",
	"timeStart": 1673355600000,
	"timeEnd": 1673442000000
}
```
Each parameters command in this format will delete any existing stored parameters. If you want to clear the parameters without defining new ones then you can use a parameter definition Cypher command with no entries as shown below:
```
:params {}
```
### Timestamps
All events have a timestamp formatted as a Unix timestamp in milliseconds. This can be calculated as milliseconds since Jan 01 1970 (UTC). The **timeStart** and **timeEnd** parameters used when querying events should also be in this format. There are many online tools that can be used to convert a human-readable date and time into this format. An example conversion interface can be found here [currentmillis.com](https://currentmillis.com/).

**Note: Please verify that the timestamp that you are using is in milliseconds. Many online conversion tools will create timestamps in seconds by default.**
### Queries
#### Get all events
This query can be used to retrieve all events in the database.
##### Parameters
None
##### Cypher Command
```
MATCH (e:Event)
RETURN e
ORDER BY e.timestamp
```

#### Get all events for a specific user
This query can be used to retrieve all events in the database involving a single specified user. 
##### Parameters
* **email** - The user's email as a String
* **IDP** - The user's IDP as a String
##### Cypher Command
```
MATCH (e:Event) 
WHERE
	($email = e.acting_user_email AND $IDP = e.acting_user_idp) OR
	($email = e.updated_user_email AND $IDP = e.updated_user_idp) OR
	($email = e.requester_email AND $IDP = e.requester_idp) OR
	($email = e.reviewer_email AND $IDP = e.reviewer_idp) OR
	($email = e.user_email AND $IDP = e.user_idp)
RETURN e
ORDER BY e.timestamp
```

#### Get all events within a specified time range
This query can be used to retrieve all events in the database that occurred between two specified timestamps.
##### Parameters
* **timeStart** - The start of the specified time range formatted as an integer representing a Unix timestamp in milliseconds
* **timeEnd** - The end of the specified time range formatted as an integer representing a Unix timestamp in milliseconds
##### Cypher Command
```
MATCH (e:Event) 
WHERE
	$timeStart <= toInteger(e.timestamp) AND
	$timeEnd >= toInteger(e.timestamp)
RETURN e
ORDER BY e.timestamp
```

#### Get all events for a specific user within a specified time range
This query can be used to retrieve all events in the database involving a single user that occurred between two specified timestamps.
##### Parameters
* **email** - The user's email as a String
* **IDP** - The user's IDP as a String
* **timeStart** - The start of the specified time range formatted as an integer representing a Unix timestamp in milliseconds
* **timeEnd** - The end of the specified time range formatted as an integer representing a Unix timestamp in milliseconds
##### Cypher Command
```
MATCH (e:Event) 
WHERE
	(
		($email = e.acting_user_email AND $IDP = e.acting_user_idp) OR
		($email = e.updated_user_email AND $IDP = e.updated_user_idp) OR
		($email = e.requester_email AND $IDP = e.requester_idp) OR
		($email = e.reviewer_email AND $IDP = e.reviewer_idp) OR
		($email = e.user_email AND $IDP = e.user_idp)
	) AND
	$timeStart <= toInteger(e.timestamp) AND
	$timeEnd >= toInteger(e.timestamp)
RETURN e
ORDER BY e.timestamp
```
