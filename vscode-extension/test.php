<?php

class HelloWorld {
    private $message;
    
    public function __construct($message = "Hello, World!") {
        $this->message = $message;
    }
    
    public function sayHello() {
        echo $this->message;
    }
}

$hello = new HelloWorld();
$hello->sayHello();

// Test function
function testFunction($param1, $param2) {
    if ($param1 > $param2) {
        return $param1;
    } else {
        return $param2;
    }
}

$result = testFunction(10, 20);
echo "Result: " . $result;