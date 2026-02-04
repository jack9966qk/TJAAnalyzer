// This is a placeholder file.
// In the Neutralino executable (native mode), the Neutralino server intercepts requests to this file
// and serves a dynamic script that injects global variables like NL_TOKEN, NL_PORT, etc. into the window object.
// These globals are required for the @neutralinojs/lib package to initialize the connection.
// This file must exist in the build output (dist) so that the <script> tag in index.html is valid
// and triggers the request that the server intercepts.
