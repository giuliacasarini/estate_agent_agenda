var request = require('request');
var fs = require('fs');

var loginJSON = {"email":"agente@mail.com", "password":"test"};
request({
    url: "http://localhost:5678/login",
    method: "POST",
    json: true,   // <--Very important!!!
    body: loginJSON
}, function (error, response, body){
    console.log(body);
});


request({
    url: "http://localhost:5678/users",
    method: "GET"
}, function (error, response, body){
    console.log(body);
});


$.ajax({
				url: 'http://localhost:5678/login',
				data: {
					'email': $('#email').val(),
					'password': $('#password').val(),
					'csrfmiddlewaretoken': '{{ csrf_token }}',
					'csrf_token': '{{ csrf_token }}',
				},
				dataType: 'json',
				type:'post',
				success: function (data) {
				location.reload();
				}
					
				
			});