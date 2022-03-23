//. app.js
var express = require( 'express' ),
    request = require( 'request' ),
    session = require( 'express-session' ),
    app = express();

app.use( express.Router() );

//. Environment Variables
var settings = require( './settings' );
var settings_fitbit_client_id = 'FITBIT_CLIENT_ID' in process.env ? process.env.FITBIT_CLIENT_ID : settings.fitbit_client_id;
var settings_fitbit_client_secret = 'FITBIT_CLIENT_SECRET' in process.env ? process.env.FITBIT_CLIENT_SECRET : settings.fitbit_client_secret;
var settings_fitbit_redirect_uri = 'FITBIT_REDIRECT_URI' in process.env ? process.env.FITBIT_REDIRECT_URI : settings.fitbit_redirect_uri;

//. Session
var sess = {
  secret: 'fitbit_api',
  cookie: {
    path: '/',
    maxAge: (7 * 24 * 60 * 60 * 1000)
  },
  resave: false,
  saveUninitialized: false
};
app.use( session( sess ) );

//. FitBit
var passport = require( 'passport' );
var FitbitStrategy = require( 'passport-fitbit-oauth2' ).FitbitOAuth2Strategy;
passport.use( new FitbitStrategy({
  clientID: settings_fitbit_client_id,
  clientSecret: settings_fitbit_client_secret,
  callbackURL: settings_fitbit_redirect_uri
},
function( access_token, refresh_token, profile, done ){
  //console.log( 'access_token', access_token );
  //console.log( 'refresh_token', refresh_token );
  //console.log( 'profile', profile );
  done( null, { accessToken: access_token, refreshToken: refresh_token, profile: profile });
}));

passport.serializeUser( function( user, done ){
  done( null, user );
});
passport.deserializeUser( function( user, done ){
  done( null, user );
});

app.use( passport.initialize() );
app.use( passport.session() );


//. Authentication request
app.get( '/auth/fitbit', 
  passport.authenticate( 'fitbit', { scope: [ 'activity', 'heartrate', 'location', 'profile' ] } )
);

//. Callback URI
app.get( '/callback', passport.authenticate( 'fitbit', {
  successRedirect: '/auth/success',
  failureRedirect: '/auth/failure',
}));

//. Forwarding URL when authentication succeeded.
app.get( '/auth/success', function( req, res, next ){
  res.contentType( 'application/json; charset=utf-8' );
  res.write( JSON.stringify( { status: true, user: req.user, url: '/auth/success' }, null, 2 ) );
  res.end();
});

//. Forwarding URL when authentication failed.
app.get( '/auth/failure', function( req, res ){
  res.contentType( 'application/json; charset=utf-8' );
  res.write( JSON.stringify( { status: true, url: '/auth/failure' }, null, 2 ) );
  res.end();
});

//. TOP
app.get( '/', function( req, res ){
  res.contentType( 'application/json; charset=utf-8' );
  res.write( JSON.stringify( { status: true, user: req.user }, null, 2 ) );
  res.end();
});

//. API Call Sample
app.get( '/profile', function( req, res ){
  res.contentType( 'application/json; charset=utf-8' );

  if( req.user && req.user.accessToken ){
    var option = {
      url: 'https://api.fitbit.com/1/user/-/profile.json',
      method: 'GET',
      headers: {
        'Authorization': 'Bearer ' + req.user.accessToken
      }
    };
    request( option, ( err0, res0, body0 ) => {
      if( err0 ){
        res.status( 400 );
        res.write( JSON.stringify( { status: false, error: err0 }, null, 2 ) );
        res.end();
      }else{
        body0 = JSON.parse( body0 );
        res.write( JSON.stringify( { status: true, result: body0 }, null, 2 ) );
        res.end();
      }
    });
  }else{
    res.status( 400 );
    res.write( JSON.stringify( { status: false, error: 'no authentication.' }, null, 2 ) );
    res.end();
  }
});


var port = process.env.PORT || 8080;
app.listen( port );
console.log( "server starting on " + port + " ..." );

module.exports = app;
