<?php

return [

    /*
    | O front-end Angular roda em outra porta (4200), então o navegador
    | precisa de permissão de CORS para chamar a API.
    */

    'paths' => ['api/*'],

    'allowed_methods' => ['*'],

    'allowed_origins' => array_filter(array_map('trim', explode(',', (string) env('FRONTEND_URL', 'http://localhost:4200')))),

    'allowed_origins_patterns' => [],

    'allowed_headers' => ['*'],

    'exposed_headers' => [],

    'max_age' => 0,

    'supports_credentials' => false,

];
