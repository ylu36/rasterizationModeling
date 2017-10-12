/* GLOBAL CONSTANTS AND VARIABLES */

/* assignment specific globals */
const WIN_Z = 0;  // default graphics window z coord in world space
const WIN_LEFT = 0; const WIN_RIGHT = 1;  // default left and right x coords in world space
const WIN_BOTTOM = 0; const WIN_TOP = 1;  // default top and bottom y coords in world space
const INPUT_TRIANGLES_URL = "https://ncsucgclass.github.io/prog2/triangles.json"; // triangles file loc
const INPUT_SPHERES_URL = "https://ncsucgclass.github.io/prog2/spheres.json"; // spheres file loc
var Eye = new vec3.fromValues(0.5,0.5,-0.5); // default eye position in world space
var Light = new vec3.fromValues(2,4,-0.5); // default light position in world space

// translation parameters
var tx = 0; var trans_x = [0,0,0,0]; var sp_x = [0,0,0,0,0];
var ty = 0; var trans_y = [0,0,0,0]; var sp_y = [0,0,0,0,0];
var tz = 0; var trans_z = [0,0,0,0]; var sp_z = [0,0,0,0,0];

// rotation parameters
var xRot = 0; var xRot_x = [0,0,0,0]; var sp_xRot = [0,0,0,0,0];
var yRot = 0; var yRot_y = [0,0,0,0]; var sp_yRot = [0,0,0,0,0];
var zRot = 0; var zRot_z = [0,0,0,0]; var sp_zRot = [0,0,0,0,0];

// object parameters
var triSet = 4;
var sprSet = 5;
var test;

var filter = 0;
var currentlyPressedKeys = {};

/* webgl globals */
var gl = null; // the all powerful gl object. It's all here folks!

// triangle global variables
var vertexBuffer; // this contains vertex coordinates in triples
var triangleBuffer; // this contains indices into vertexBuffer in triples
var triBufferSize = 0; // the number of indices in the triangle buffer
var colorBuffer; // this contains color components of triangle primitives

// vertex shader attributes
var vertexPositionAttrib; // where to put position for vertex shader
var mvMatAttrib; // where to put position for model view matrix
var pMatAttrib; // where to put position for projection matrix
var lMatAttrib; // where to put position for look at matrix
var nMatAttrib; // where to put position for normal matrix
var ambientAttrib; // where to put position for ambient color
var diffuseAttrib; // where to put position for diffuse color
var specAttrib; // where to put position for specular color
var lightAttrib; // where to put position for light vector
var normalPositionAttrib; // where to put position for normal vector

// create matrices
var mvMatrix = mat4.create();
var pMatrix = mat4.create();
var lMatrix = mat4.create();
var nMatrix = mat3.create();

// color components
var ambient = vec3.create();
var diffuse = vec3.create();
var specular = vec3.create();

// ASSIGNMENT HELPER FUNCTIONS

// get the JSON file from the passed URL
function getJSONFile(url,descr) {
    try {
        if ((typeof(url) !== "string") || (typeof(descr) !== "string"))
            throw "getJSONFile: parameter not a string";
        else {
            var httpReq = new XMLHttpRequest(); // a new http request
            httpReq.open("GET",url,false); // init the request
            httpReq.send(null); // send the request
            var startTime = Date.now();
            while ((httpReq.status !== 200) && (httpReq.readyState !== XMLHttpRequest.DONE)) {
                if ((Date.now()-startTime) > 3000)
                    break;
            } // until its loaded or we time out after three seconds
            if ((httpReq.status !== 200) || (httpReq.readyState !== XMLHttpRequest.DONE))
                throw "Unable to open "+descr+" file!";
            else
                return JSON.parse(httpReq.response);
        } // end if good params
    } // end try

    catch(e) {
        console.log(e);
        return(String.null);
    }
} // end get input spheres

// set up the webGL environment
function setupWebGL() {

    // Get the canvas and context
    var canvas = document.getElementById("myWebGLCanvas"); // create a js canvas
    gl = canvas.getContext("webgl"); // get a webgl object from it
    gl.viewportWidth = canvas.width;
    gl.viewportHeight = canvas.height;

    try {
      if (gl == null) {
        throw "unable to create gl context -- is your browser gl ready?";
      } else {
        gl.clearColor(0.0, 0.0, 0.0, 1.0); // use black when we clear the frame buffer
        gl.clearDepth(1.0); // use max when we clear the depth buffer
        gl.enable(gl.DEPTH_TEST); // use hidden surface removal (with zbuffering)
      }
    } // end try

    catch(e) {
      console.log(e);
    } // end catch

} // end setupWebGL

// read triangles in, load them into webgl buffers
// http://learningwebgl.com/blog/
function loadTriangles() {
    var inputTriangles = getJSONFile(INPUT_TRIANGLES_URL,"triangles");

    if (inputTriangles != String.null) {
        var whichSetVert; // index of vertex in current triangle set
        var whichSetTri; // index of triangle in current triangle set

        for (var whichSet=0; whichSet<inputTriangles.length; whichSet++) {
            triBufferSize = 0;
            var coordArray = []; // 1D array of vertex coords for WebGL
            var indexArray = []; // 1D array of vertex indices for WebGL
            var normalArray = []; // 1D array to vertex normals for webGL

            var vtxBufferSize = 0; // the number of vertices in the vertex buffer
            var vtxToAdd = []; // vtx coords to add to the coord array
            var nrmToAdd = []; // normals to add to normal array

            var indexOffset = vec3.create(); // the index offset for the current set
            var triToAdd = vec3.create(); // tri indices to add to the index array

            vec3.set(indexOffset,vtxBufferSize,vtxBufferSize,vtxBufferSize); // update vertex offset

            // blinn-phong shading
            ambient = inputTriangles[whichSet].material.ambient;
            diffuse = inputTriangles[whichSet].material.diffuse;
            specular = inputTriangles[whichSet].material.specular;

            // set up the vertex coord array
            for (whichSetVert=0; whichSetVert<inputTriangles[whichSet].vertices.length; whichSetVert++) {
                vtxToAdd = inputTriangles[whichSet].vertices[whichSetVert];
                nrmToAdd = inputTriangles[whichSet].normals[whichSetVert];
                coordArray.push(vtxToAdd[0],vtxToAdd[1],vtxToAdd[2]);
                normalArray.push(nrmToAdd[0],nrmToAdd[1],nrmToAdd[2]);
            } // end for vertices in set

            // set up the triangle index array, adjusting indices across sets
            for (whichSetTri=0; whichSetTri<inputTriangles[whichSet].triangles.length; whichSetTri++) {
                vec3.add(triToAdd,indexOffset,inputTriangles[whichSet].triangles[whichSetTri]);
                indexArray.push(triToAdd[0],triToAdd[1],triToAdd[2]);
            } // end for triangles in set

            vtxBufferSize += inputTriangles[whichSet].vertices.length; // total number of vertices
            triBufferSize += inputTriangles[whichSet].triangles.length; // total number of tris

        triBufferSize *= 3; // now total number of indices

        // send the vertex coords to webGL
        vertexBuffer = gl.createBuffer(); // init empty vertex coord buffer
        gl.bindBuffer(gl.ARRAY_BUFFER,vertexBuffer); // activate that buffer
        gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(coordArray),gl.STATIC_DRAW); // coords to that buffer

        // send the triangle indices to webGL
        triangleBuffer = gl.createBuffer(); // init empty triangle index buffer
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, triangleBuffer); // activate that buffer
        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER,new Uint16Array(indexArray),gl.STATIC_DRAW); // indices to that buffer

        // send normals to webGL
        normalBuffer = gl.createBuffer(); //init empty normal coord buffer
        gl.bindBuffer(gl.ARRAY_BUFFER,normalBuffer); // activate that buffer
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(normalArray),gl.STATIC_DRAW); //normals to that buffer

        // translate or rotate current object
        if (whichSet == triSet) {
          ambient = [0.5,0.5,0];
          diffuse = [0.5,0.5,0];
          specular = [0,0,0];

          // matrix transforms
          mat4.perspective(pMatrix, Math.PI/2, gl.viewportWidth / gl.viewportHeight, 0.1, 100.0);
          mat4.identity(mvMatrix);
          mat4.translate(mvMatrix, mvMatrix, [0,0,0]);
          mat4.lookAt(lMatrix, [0.5 + trans_x[triSet] + tx, 0.5 + trans_y[triSet] + ty, -0.5 + trans_z[triSet] + tz], [0.5 + trans_x[triSet] + tx, 0.5 + trans_y[triSet] + ty, 0 + tz], [0, 1, 0]);

          mat4.rotate(mvMatrix, mvMatrix, degToRad(xRot_x[triSet] + xRot), [1, 0, 0]);
          mat4.rotate(mvMatrix, mvMatrix, degToRad(yRot_y[triSet] + yRot), [0, 1, 0]);
          mat4.rotate(mvMatrix, mvMatrix, degToRad(zRot_z[triSet] + zRot), [0, 0, 1]);

          var mMatrix = mat4.create();
          mat4.mul(mMatrix, lMatrix, mvMatrix);
          mat3.normalFromMat4(nMatrix, mMatrix);

          setMatrixUniforms();
          setColorUniforms();
          renderTriangles();
          continue;
        }

        // matrix transforms
        mat4.perspective(pMatrix, Math.PI/2, gl.viewportWidth / gl.viewportHeight, 0.1, 100.0);
        mat4.identity(mvMatrix);
        mat4.translate(mvMatrix, mvMatrix, [0,0,0]);
        mat4.lookAt(lMatrix, [0.5 + trans_x[whichSet] + tx, 0.5 + trans_y[whichSet] + ty, -0.5 + trans_z[whichSet] + tz], [0.5 + trans_x[whichSet] + tx, 0.5 + trans_y[whichSet] + ty, 0 + tz], [0, 1, 0]);


        mat4.rotate(mvMatrix, mvMatrix, degToRad(xRot_x[whichSet] + xRot), [1, 0, 0]);
        mat4.rotate(mvMatrix, mvMatrix, degToRad(yRot_y[whichSet] + yRot), [0, 1, 0]);
        mat4.rotate(mvMatrix, mvMatrix, degToRad(zRot_z[whichSet] + zRot), [0, 0, 1]);


        var mMatrix = mat4.create();
        mat4.mul(mMatrix, lMatrix, mvMatrix);
        mat3.normalFromMat4(nMatrix, mMatrix);

        setMatrixUniforms();
        setColorUniforms();
        renderTriangles();
        } // end for each triangle set
    } // end if triangles found
} // end load triangles


// read spheres in, load them into webgl buffers
// http://learningwebgl.com/blog/
function loadSpheres() {
    var inputSpheres = getJSONFile(INPUT_SPHERES_URL,"spheres");

    if (inputSpheres != String.null) {
      var latitudeBands = 30;
      var longitudeBands = 30;

      for (var whichSet=0; whichSet<inputSpheres.length; whichSet++) {
          var radius = inputSpheres[whichSet].r;
          var cx = inputSpheres[whichSet].x;
          var cy = inputSpheres[whichSet].y;
          var cz = inputSpheres[whichSet].z;
          var center = new vec3.fromValues(cx,cy,cz);

          ambient = inputSpheres[whichSet].ambient;
          diffuse = inputSpheres[whichSet].diffuse;
          specular = inputSpheres[whichSet].specular;

          var coordArray = [];
          var normalArray = [];
          var indexArray = [];

          for (var latNumber = 0; latNumber <= latitudeBands; latNumber++) {
              var theta = latNumber * Math.PI / latitudeBands;
              var sinTheta = Math.sin(theta);
              var cosTheta = Math.cos(theta);

              for (var longNumber = 0; longNumber <= longitudeBands; longNumber++) {
                  var phi = longNumber * 2 * Math.PI / longitudeBands;
                  var sinPhi = Math.sin(phi);
                  var cosPhi = Math.cos(phi);

                  var x = cosPhi * sinTheta;
                  var y = cosTheta;
                  var z = sinPhi * sinTheta;

                  normalArray.push(x);
                  normalArray.push(y);
                  normalArray.push(z);
                  coordArray.push(radius * x);
                  coordArray.push(radius * y);
                  coordArray.push(radius * z);
              }
          }

          for (var latNumber = 0; latNumber < latitudeBands; latNumber++) {
              for (var longNumber = 0; longNumber < longitudeBands; longNumber++) {
                  var first = (latNumber * (longitudeBands + 1)) + longNumber;
                  var second = first + longitudeBands + 1;
                  indexArray.push(first);
                  indexArray.push(second);
                  indexArray.push(first + 1);

                  indexArray.push(second);
                  indexArray.push(second + 1);
                  indexArray.push(first + 1);
              }
          }

    triBufferSize = indexArray.length;

    // send the vertices to webGL
    vertexBuffer = gl.createBuffer(); // init empty vertex coord buffer
    gl.bindBuffer(gl.ARRAY_BUFFER,vertexBuffer); // activate that buffer
    gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(coordArray),gl.STATIC_DRAW); // coords to that buffer

    // send the triangle indices to webGL
    triangleBuffer = gl.createBuffer(); // init empty triangle index buffer
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, triangleBuffer); // activate that buffer
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER,new Uint16Array(indexArray),gl.STATIC_DRAW); // indices to that buffer

    // send normals to webGL
    normalBuffer = gl.createBuffer(); //init empty normal coord buffer
    gl.bindBuffer(gl.ARRAY_BUFFER,normalBuffer); // activate that buffer
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(normalArray),gl.STATIC_DRAW); //normals to that buffer

    // translate and rotate current object
    if (whichSet == sprSet) {
      ambient = [0.5,0.5,0];
      diffuse = [0.5,0.5,0];
      specular = [0,0,0];

      // matrix transforms
      mat4.perspective(pMatrix, Math.PI/2, gl.viewportWidth / gl.viewportHeight, 0.1, 100.0);
      mat4.identity(mvMatrix);
      mat4.translate(mvMatrix, mvMatrix, center);
      mat4.lookAt(lMatrix, [0.5 + sp_x[sprSet] + tx, 0.5 + sp_y[sprSet] + ty, -0.5 + sp_z[sprSet] + tz], [0.5 + sp_x[sprSet] + tx, 0.5 + sp_y[sprSet] + ty, 0 + tz], [0, 1, 0]);

      mat4.rotate(mvMatrix, mvMatrix, degToRad(sp_xRot[sprSet] + xRot), [1, 0, 0]);
      mat4.rotate(mvMatrix, mvMatrix, degToRad(sp_yRot[sprSet] + yRot), [0, 1, 0]);
      mat4.rotate(mvMatrix, mvMatrix, degToRad(sp_zRot[sprSet] + zRot), [0, 0, 1]);

      mat4.rotate(lMatrix, lMatrix, degToRad(sp_xRot[sprSet] + xRot), [1, 0, 0]);
      mat4.rotate(lMatrix, lMatrix, degToRad(sp_yRot[sprSet] + yRot), [0, 1, 0]);
      mat4.rotate(lMatrix, lMatrix, degToRad(sp_zRot[sprSet] + zRot), [0, 0, 1]);

      var mMatrix = mat4.create();
      mat4.mul(mMatrix, lMatrix, mvMatrix);
      mat3.normalFromMat4(nMatrix, mMatrix);

      setMatrixUniforms();
      setColorUniforms();
      renderTriangles();
      continue;
    }

    // matrix transforms
    mat4.perspective(pMatrix, Math.PI/2, gl.viewportWidth / gl.viewportHeight, 0.1, 100.0);
    mat4.identity(mvMatrix);
    mat4.translate(mvMatrix, mvMatrix, center);
    mat4.lookAt(lMatrix, [0.5 + sp_x[whichSet] + tx, 0.5 + sp_y[whichSet] + ty, -0.5 + sp_z[whichSet] + tz], [0.5 + sp_x[whichSet] + tx, 0.5 + sp_y[whichSet] + ty, 0 + tz], [0, 1, 0]);

    mat4.rotate(mvMatrix, mvMatrix, degToRad(sp_xRot[whichSet] + xRot), [1, 0, 0]);
    mat4.rotate(mvMatrix, mvMatrix, degToRad(sp_yRot[whichSet] + yRot), [0, 1, 0]);
    mat4.rotate(mvMatrix, mvMatrix, degToRad(sp_zRot[whichSet] + zRot), [0, 0, 1]);

    mat4.rotate(lMatrix, lMatrix, degToRad(sp_xRot[whichSet] + xRot), [1, 0, 0]);
    mat4.rotate(lMatrix, lMatrix, degToRad(sp_yRot[whichSet] + yRot), [0, 1, 0]);
    mat4.rotate(lMatrix, lMatrix, degToRad(sp_zRot[whichSet] + zRot), [0, 0, 1]);

    var mMatrix = mat4.create();
    mat4.mul(mMatrix, lMatrix, mvMatrix);
    mat3.normalFromMat4(nMatrix, mMatrix);

    setMatrixUniforms();
    setColorUniforms();
    renderTriangles();
    }
  }
}


// setup the webGL shaders
// http://learningwebgl.com/blog/
function setupShaders() {

    // define fragment shader in essl using es6 template strings
    // https://www.tutorialspoint.com/webgl/webgl_colors.htm
    var fShaderCode = `
        precision mediump float;
        varying vec3 vColor;

        void main(void) {
            gl_FragColor = vec4(vColor, 1.0); // colored fragments
        }
    `;

    // define vertex shader in essl using es6 template strings
    var vShaderCode = `
        attribute vec3 vertexPosition;
        varying vec3 vColor;

        uniform mat4 uMVMatrix;
        uniform mat4 uPMatrix;
        uniform mat4 uLMatrix;
        uniform mat3 uNMatrix;

        uniform vec3 ambientColor;
        uniform vec3 diffuseColor;
        uniform vec3 specColor;

        uniform vec3 lightPos;
        attribute vec3 normalV;

        void main(void) {

          gl_Position = uPMatrix * uLMatrix * uMVMatrix * vec4(vertexPosition, 1.0); // transformed position
          vec4 vertPos = uLMatrix * uMVMatrix * vec4(vertexPosition, 1.0);

          vec3 normal = vec3(uNMatrix * normalV);
          normal = normalize(normal);

          vec3 lightDir = normalize(lightPos - vertPos.xyz);

          float lambertian = max(dot(lightDir,normal), 0.0);
          float specular = 0.0;

          if(lambertian > 0.0) {
            vec3 viewDir = normalize(-vertPos.xyz);
            vec3 halfDir = normalize(lightDir + viewDir);
            float specAngle = max(dot(halfDir, normal), 0.0);
            specular = pow(specAngle, 15.0);
          }
            vColor = ambientColor + lambertian * diffuseColor + specular * specColor;
        }
    `;

    try {
        var fShader = gl.createShader(gl.FRAGMENT_SHADER); // create frag shader
        gl.shaderSource(fShader,fShaderCode); // attach code to shader
        gl.compileShader(fShader); // compile the code for gpu execution

        var vShader = gl.createShader(gl.VERTEX_SHADER); // create vertex shader
        gl.shaderSource(vShader,vShaderCode); // attach code to shader
        gl.compileShader(vShader); // compile the code for gpu execution

        if (!gl.getShaderParameter(fShader, gl.COMPILE_STATUS)) { // bad frag shader compile
            throw "error during fragment shader compile: " + gl.getShaderInfoLog(fShader);
            gl.deleteShader(fShader);
        } else if (!gl.getShaderParameter(vShader, gl.COMPILE_STATUS)) { // bad vertex shader compile
            throw "error during vertex shader compile: " + gl.getShaderInfoLog(vShader);
            gl.deleteShader(vShader);
        } else { // no compile errors
            var shaderProgram = gl.createProgram(); // create the single shader program
            gl.attachShader(shaderProgram, fShader); // put frag shader in program
            gl.attachShader(shaderProgram, vShader); // put vertex shader in program
            gl.linkProgram(shaderProgram); // link program into gl context

            if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) { // bad program link
                throw "error during shader program linking: " + gl.getProgramInfoLog(shaderProgram);
            } else { // no shader program link errors
                gl.useProgram(shaderProgram); // activate shader program (frag and vert)
                vertexPositionAttrib = // get pointer to vertex shader input
                    gl.getAttribLocation(shaderProgram, "vertexPosition");
                gl.enableVertexAttribArray(vertexPositionAttrib); // input to shader from array

                normalPositionAttrib = // get pointer to vertex shader input
                    gl.getAttribLocation(shaderProgram, "normalV");
                gl.enableVertexAttribArray(normalPositionAttrib); // input to shader from array

                pMatAttrib = // get pointer
                    gl.getUniformLocation(shaderProgram, "uPMatrix");
                gl.enableVertexAttribArray(pMatAttrib);

                mvMatAttrib = // get pointer
                    gl.getUniformLocation(shaderProgram, "uMVMatrix");
                gl.enableVertexAttribArray(mvMatAttrib);

                lMatAttrib = // get pointer
                    gl.getUniformLocation(shaderProgram, "uLMatrix");
                gl.enableVertexAttribArray(lMatAttrib);

                nMatAttrib = // get pointer
                    gl.getUniformLocation(shaderProgram, "uNMatrix");
                gl.enableVertexAttribArray(nMatAttrib);

                ambientAttrib = // get pointer
                    gl.getUniformLocation(shaderProgram, "ambientColor");
                gl.enableVertexAttribArray(ambientAttrib);

                diffuseAttrib = // get pointer
                    gl.getUniformLocation(shaderProgram, "diffuseColor");
                gl.enableVertexAttribArray(diffuseAttrib);

                specAttrib = // get pointer
                    gl.getUniformLocation(shaderProgram, "specColor");
                gl.enableVertexAttribArray(specAttrib);

                lightAttrib = // get pointer
                    gl.getUniformLocation(shaderProgram, "lightPos");
                gl.enableVertexAttribArray(lightAttrib);

            } // end if no shader program link errors
        } // end if no compile errors
    } // end try

    catch(e) {
        console.log(e);
    } // end catch
} // end setup shaders

// http://learningwebgl.com/blog/
function setMatrixUniforms() {
    gl.uniformMatrix4fv(pMatAttrib, false, pMatrix);
    gl.uniformMatrix4fv(mvMatAttrib, false, mvMatrix);
    gl.uniformMatrix4fv(lMatAttrib, false, lMatrix);
    gl.uniformMatrix3fv(nMatAttrib, false, nMatrix);
}

// http://learningwebgl.com/blog/
function setColorUniforms() {
    gl.uniform3fv(lightAttrib, Light);
    gl.uniform3fv(ambientAttrib, ambient);
    gl.uniform3fv(diffuseAttrib, diffuse);
    gl.uniform3fv(specAttrib, specular);
}
// render the loaded model
function renderTriangles() {
    // vertex buffer: activate and feed into vertex shader
    gl.bindBuffer(gl.ARRAY_BUFFER,vertexBuffer); // activate
    gl.vertexAttribPointer(vertexPositionAttrib,3,gl.FLOAT,false,0,0); // feed

    // normal buffer: activate and feed into vertex shader
    gl.bindBuffer(gl.ARRAY_BUFFER,normalBuffer); // activate
    gl.vertexAttribPointer(normalPositionAttrib,3,gl.FLOAT,false,0,0); // feed

    // triangle buffer: activate and render
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,triangleBuffer); // activate
    gl.drawElements(gl.TRIANGLES,triBufferSize,gl.UNSIGNED_SHORT,0); // render
} // end render triangles

// http://learningwebgl.com/blog/
function handleKeyDown(event) {
        currentlyPressedKeys[event.keyCode] = true;
        if (String.fromCharCode(event.keyCode) == "F") {
            filter += 1;
            if (filter == 3) {
                filter = 0;
            }
        }
    }
    function handleKeyUp(event) {
        currentlyPressedKeys[event.keyCode] = false;
    }

function handleKeys() {
// rotation of planes
if (currentlyPressedKeys[16]) {
        if (currentlyPressedKeys[81]) {
            // Q cursor key
            zRot -= 1;
        }
        if (currentlyPressedKeys[69]) {
            // E cursor key
            zRot += 1;
        }
        if (currentlyPressedKeys[87]) {
            // W cursor key
            xRot += 1;
        }
        if (currentlyPressedKeys[83]) {
            // S cursor key
            xRot -= 1;
        }
        if (currentlyPressedKeys[65]) {
            // A cursor key
            yRot += 1;
        }
        if (currentlyPressedKeys[68]) {0
            // D cursor key
            yRot -= 1;
        }
      }

else {
// translation of planes
        if (currentlyPressedKeys[87]) {
                    // w cursor key
                    tz += 0.01;
                }
        if (currentlyPressedKeys[83]) {
                    // s cursor key
                    tz -= 0.01;
                }
        if (currentlyPressedKeys[65]) {
                    // a cursor key
                    tx += 0.01;
                }
        if (currentlyPressedKeys[68]) {
                    // d cursor key
                    tx -= 0.01;
                }
        if (currentlyPressedKeys[81]) {
                    // q cursor key
                    ty += 0.01;
                }
        if (currentlyPressedKeys[69]) {
                    // e cursor key
                    ty -= 0.01;
                }
}

// for objects
// check selection of triangles or spheres
if (currentlyPressedKeys[37]){
  //left cursor key
  delay(100);
  sprSet = 5; test = 0;
      if (triSet >= 3) {
        triSet = 0;
      }
      else
      triSet += 1;
}

else if (currentlyPressedKeys[39]){
  // right cursor key
  delay(100);
  sprSet = 5; test = 0;
      if (triSet == 0) {
        triSet = 3;
      }
      else
      triSet -= 1;
}

else if (currentlyPressedKeys[38]){
  // up cursor key
  delay(100);
  triSet = 4; test = 1;
      if (sprSet >= 4) {
        sprSet = 0;
      }
      else
      sprSet += 1;
      console.log(sprSet);
}

else if (currentlyPressedKeys[40]){
  // down cursor key
  delay(100);
  triSet = 4; test = 1;
      if (sprSet == 0) {
        sprSet = 4;
      }
      else
      sprSet -= 1;
}

// rotation of object
if (currentlyPressedKeys[16]) {
        if (currentlyPressedKeys[73]) {
            // I cursor key
            if (test == 0)
            zRot_z[triSet] += 1;
            sp_zRot[sprSet] += 1;
        }
        if (currentlyPressedKeys[80]) {
            // P cursor key
            if (test == 0)
            zRot_z[triSet] -= 1;
            sp_zRot[sprSet] -= 1;
        }
        if (currentlyPressedKeys[79]) {
            // O cursor key
            if (test == 0)
            xRot_x[triSet] += 1;
            sp_xRot[sprSet] += 1;
        }
        if (currentlyPressedKeys[76]) {
            // L cursor key
            if (test == 0)
            xRot_x[triSet] -= 1;
            sp_xRot[sprSet] -= 1;
        }
        if (currentlyPressedKeys[75]) {
            // K cursor key
            if (test == 0)
            yRot_y[triSet] += 1;
            sp_yRot[sprSet] += 1;
        }
        if (currentlyPressedKeys[186]) {
            // : cursor key
            if (test == 0)
            yRot_y[triSet] -= 1;
            sp_yRot[sprSet] -= 1;
        }
     }

// translation of objects
else {
        if (currentlyPressedKeys[79]) {
                    // o cursor key
                    if (test == 0)
                    trans_z[triSet] -= 0.01;
                    sp_z[sprSet] -= 0.01;
                }
        if (currentlyPressedKeys[76]) {
                    // l cursor key
                    if (test == 0)
                    trans_z[triSet] += 0.01;
                    sp_z[sprSet] += 0.01;
                }
        if (currentlyPressedKeys[75]) {
                    // k cursor key
                    if (test == 0)
                    trans_x[triSet] -= 0.01;
                    sp_x[sprSet] -= 0.01;
                }
        if (currentlyPressedKeys[186]) {
                    // ; cursor key
                    if (test == 0)
                    trans_x[triSet] += 0.01;
                    sp_x[sprSet] += 0.01;
                }
        if (currentlyPressedKeys[73]) {
                    // i cursor key
                    if (test == 0)
                    trans_y[triSet] -= 0.01;
                    sp_y[sprSet] -= 0.01;
                }
        if (currentlyPressedKeys[80]) {
                    // p cursor key
                    if (test == 0)
                    trans_y[triSet] += 0.01;
                    sp_y[sprSet] += 0.01;
                }
}

        if (currentlyPressedKeys[27]) {
            // escape cursor key
          tx = 0; ty = 0; tz = 0;
          xRot = 0; yRot = 0; zRot = 0;
        }

        if (currentlyPressedKeys[8]) {
            // backspace cursor key
            trans_x = [0,0,0,0]; trans_y = [0,0,0,0]; trans_z = [0,0,0,0];
            sp_x = [0,0,0,0,0]; sp_y = [0,0,0,0,0]; sp_z = [0,0,0,0,0];

            xRot_x = [0,0,0,0]; yRot_y = [0,0,0,0]; zRot_z = [0,0,0,0];
            sp_xRot = [0,0,0,0,0]; sp_yRot = [0,0,0,0,0]; sp_zRot = [0,0,0,0,0];

        }

       if (currentlyPressedKeys[32]) {
         // spacebar key
         triSet = 4;
         sprSet = 5;
       }
    }

// http://stackoverflow.com/questions/24849/is-there-some-way-to-introduce-a-delay-in-javascript
function delay(ms) {
      var cur_d = new Date();
      var cur_ticks = cur_d.getTime();
      var ms_passed = 0;
      while(ms_passed < ms) {
          var d = new Date();  // Possible memory leak?
          var ticks = d.getTime();
          ms_passed = ticks - cur_ticks;
                // d = null;  // Prevent memory leak?
          }
    }

function degToRad(degrees) {
      return degrees * Math.PI / 180;
    }

    // http://learningwebgl.com/blog/
function tick() {
    requestAnimationFrame(tick);
    handleKeys();

    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT); // clear frame/depth buffers

    loadTriangles();
    loadSpheres();
    }


/* MAIN -- HERE is where execution begins after window load */

function main() {
  setupWebGL(); // set up the webGL environment
  setupShaders(); // setup the webGL shaders

  gl.viewport(0,0,gl.viewportWidth,gl.viewportHeight);
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT); // clear frame/depth buffers

  //loadTriangles(); // load in the triangles from tri file
  //loadSpheres(); // load in the triangles from spheres file

  document.onkeydown = handleKeyDown;
  document.onkeyup = handleKeyUp;
  tick();
} // end main
