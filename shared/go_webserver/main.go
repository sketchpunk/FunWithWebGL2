package main

import (
	"fmt"
	//"html"
	"io"
	"log"
	"net/http"
	"os"
	"strconv"
	//"time"
	"encoding/json"
	"regexp"
)

/*
https://golang.org/doc/effective_go.html

https://tutorialedge.net/post/golang/creating-simple-web-server-with-golang/
https://gocodecloud.com/blog/2016/11/15/simple-golang-http-request-context-example/
http://go-talks.appspot.com/github.com/dkondratovych/golang-ua-meetup/go-context/ctx.slide#7
http://www.mrwaggel.be/post/Golang-transmit-files-over-a-nethttp-server-to-clients/

https://golang.org/src/net/http/fs.go
https://golang.org/pkg/net/http/#example_FileServer
https://neoteric.eu/how-to-serve-static-files-with-golang
*/

type appConfig struct {
	HttpPort     string `json:"httpPort"`
	HttpRootPath string `json:"httpRootPath"`
}

func main() {
	config, err := loadConfig()
	if err != nil {
		fmt.Println("Config", err)
		os.Exit(1)
	}
	//C:\Users\Pedro\go\src\httpserv\html
	//http.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
	//	fmt.Fprintf(w, "Hello %q", html.EscapeString(r.URL.Path))
	//})


	//Setup fileServer to change mime types for specific types that may be required by browser
	//https://www.lemoda.net/go/override-mime-type/
	var fileServer = http.FileServer(http.Dir(config.HttpRootPath))
	var jsExt = regexp.MustCompile("\\.js$");
	//http.Handle("/", fileServer)
	http.HandleFunc("/",func(w http.ResponseWriter, r *http.Request){
		uri := r.RequestURI

		//To handle JS Modules in chrome, need this content type sent
		if jsExt.MatchString(uri){ 
			w.Header().Set("Content-Type","application/javascript")
		}	
		fileServer.ServeHTTP(w,r);
	})


	//http.Handle("/", http.FileServer(http.Dir(config.HttpRootPath)))
	http.HandleFunc("/exit", func(w http.ResponseWriter, r *http.Request) {
		msg := "bye"
		w.Header().Set("Content-Type", "text/plain; charset=utf-8")
		w.Header().Set("Content-Length", strconv.Itoa(len(msg))) //Convert int to string
		io.WriteString(w, msg)

		f, canFlush := w.(http.Flusher)
		if canFlush {
			f.Flush()
		}

		conn, _, err := w.(http.Hijacker).Hijack()
		if err != nil {
			log.Fatalf("error while shutting down: %v", err)
		}

		conn.Close()

		log.Println("Shutting down")
		os.Exit(0)

		//fmt.Fprint(w, "Existing Now")

		/*

			if f, ok := w.(http.Flusher); ok {
				fmt.Println("Flushing")
				f.Flush()
			}
			time.Sleep(5000)

			conn, _, err := w.(http.Hijacker).Hijack()
			if err != nil {
				log.Fatalf("error while shutting down: %v", err)
			}

			conn.Close()
		*/
	})

	fmt.Println("Starting HTTP Listening")
	log.Fatal(http.ListenAndServe(":"+config.HttpPort, nil))
	//log.Fatal(http.ListenAndServe(":1337", http.FileServer(http.Dir("./html"))))
}

func loadConfig() (appConfig, error) {
	var config appConfig
	file, err := os.Open("config.json")
	if err != nil {
		return config, err
	}
	/*
		data := make([]byte, 100)
		cnt, err := file.Read(data)
		if err != nil {
			fmt.Println(err)
			return false
		}

		fmt.Println(strconv.Itoa(cnt))
		fmt.Printf(string(data[10:cnt]))
	*/
	decoder := json.NewDecoder(file)

	err = decoder.Decode(&config)
	file.Close()
	return config, err
}
