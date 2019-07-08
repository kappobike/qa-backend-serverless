  //En terminal se pueden capturar los eventos 
  //con este código: serverless logs -f triggerStream -t

'use strict';
const { createApolloFetch } = require('apollo-fetch');

const SM_GRAPHQL_API = process.env.SM_GRAPHQL_API;

const apolloFetch = createApolloFetch({ uri: SM_GRAPHQL_API });

apolloFetch.use(({ request, options }, next) => {
  options.headers = {
    "Content-Type": "application/json",
    "X-Api-Key": process.env.API_KEY
  };
  next();
});

module.exports.triggerStream = (event, context, callback) => {
  console.log('trigger stream was called');
  const eventData = event.Records[0];
  var key = eventData.dynamodb.Keys.id.S;
  var eventName = eventData.eventName;

 //console.log(eventData);
 //console.log(eventData.dynamodb.Keys);

 console.log('Dynamodb Event: ' + eventName + '. Key: '+ key);

 const getUserID = `
 query getUserID($id: ID!) {
  getTrip(id: $id) {
    user {
      id
    }
    time_seconds
  }
}
`;

const getUserRankings = `
 query getUserRankings($id: ID!) {
  getUserProfile(id: $id) {
    rankings{
      items{
        id
        ranking_type
        valrank
      }
    }
  }
}
`;

const startRanking = `
  mutation startRanking($type: RankingType!, $valrank: Float, $rankingUserId: ID) {
    createRanking(input: {
      ranking_type: $type
      valrank: $valrank
      rankingUserId: $rankingUserId
    })
    {
      id
    }
  }
`;

const fetchUserData = () =>
apolloFetch({
  query: getUserID,
  variables: { id: key }
}).catch(error => {
  console.log(error);
});

fetchUserData().then(response => {
  
  //console.log(response)
  console.log('ID Usuario Trip: ' + response.data.getTrip.user.id)
  var user = response.data.getTrip.user.id;
  //var zone = response.data.getTrip.zone.id;
  var time_seconds = response.data.getTrip.time_seconds;

  const fetchUserRankings = () =>
  apolloFetch({
    query: getUserRankings,
    variables: { id: user }
  }).catch(error => {
    console.log(error);
  });

  fetchUserRankings().then(res => {
    console.log(user);
    console.log(time_seconds);
    console.log(res);
    var rankingID = res.data.getUserProfile.rankings.items.id;
    console.log(rankingID);
    var valrank = res.data.getUserProfile.rankings.items.valrank;
    console.log(valrank);

    const fetchStartRankingWeek = () =>
    apolloFetch({
      query: startRanking,
      variables: { type: "WEEK", valrank: time_seconds, rankingUserId: user }
    }).catch(error => {
      console.log(error);
    });

    const fetchStartRankingMonth = () =>
    apolloFetch({
      query: startRanking,
      variables: { type: "MONTH", valrank: time_seconds, rankingUserId: user }
    }).catch(error => {
      console.log(error);
    });

    const fetchStartRankingYear = () =>
    apolloFetch({
      query: startRanking,
      variables: { type: "YEAR", valrank: time_seconds, rankingUserId: user }
    }).catch(error => {
      console.log(error);
    });

    if (rankingID === undefined) {
      console.log('Inicializando Ranking...');
      fetchStartRankingWeek().then(res=> console.log(res));
      fetchStartRankingMonth().then(res=> console.log(res));
      fetchStartRankingYear().then(res=> console.log(res));
    } else {
        console.log('Bloque de Actualización Ranking');
    }    
    
  });
  
});
callback(null, null);
//callback(null, { message: 'Dynamodb Event: ' + eventName + '. Key: '+ key + '!', event });
};