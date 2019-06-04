/* Author:		Ryan Armstrong
 * Project:		Project 4
 * Due: 		Thursday November 27, 2018
 * Course:		CSCI 4250-001
 * Instructor:	Dr. Cen Li
 *
 * This program draws some 3D shapes.
 */
var gl;

var mvMat;		// model view matrix
var mvMatLoc;	// model view matrix location in vertex shader
var mvMatStack = [];

var projMat;	// projection matrix
var projMatLoc;	// location of projection matrix in vertex shader

var points = [];	// point definitions
var colors = [];	// colors of points
var normals = [];	// normals of vertices
let texCoords = [];	// texture coordinates for each point
let textures = [];	// textures
let sounds = [];	// sounds

var faces 	= [];	// contains meta info about points (location in points array, number of points per shape/face)
var scenery	= [];	// meta info about faces in a piece of scenery

// LIGHTING AND MATERIALS
var lightPosition = vec4(0, 4, 0, 1);

var lightAmbient = vec4(0.25, 0.25, 0.35, 1);
var lightDiffuse = vec4(0.5, 0.5, 0.5, 1);
var lightSpecular = vec4(0.5, 0.5, 0.5, 1.0);

var materialAmbient = vec4(0.2, 0.2, 0.2, 1.0);
var materialDiffuse = vec4(0.0, 0.5, 1.0, 1.0);
var materialSpecular = vec4(1.0, 1.0, 1.0, 1.0);
var materialShininess = 50.0;

// ANIMATION
var animate 	= false;
var animProg 	= 0;	// animation progress

// holoprojector animation controls
var hpRotateUpAnim			= false;	// speed up rotation
var hpRotateAnim 			= false;	// holo projector rotation
var hpRotateDownAnim		= false;	// slow down rotation
var hpRotation 				= 0;		// rotation amount
var hpRotationSpeed 		= 0;		// speed of rotation
var hpRotationSpeedStep 	= 0.02;		// rate at which rotation increases
var hpRotationSpeedMax 		= 4; 		// max rotation speed
var hpHeightAnim 			= false;	// holo projector up/down
var hpHeight 				= 0;		// vertical offset
var hpHeightStep 			= 0.025;	// rate at which height changes
var hpHeightMaxOffs 		= 4;		// max vert offset
var hpHeightCycle 			= 0;		// keep track of how many times it's gone up and down
var hpHeightCycleMax		= 2; 
var hpLasersOn 				= false;	// holo projector lasers

// cryo chamber animation controls
var openCryoAnim 	= false;	// cryo chamber open
var cryoAnimProg 	= 0;		// cryo chamber animation step
var cryoAnimMax 	= 1;		// cryo chamber max separation
var cryoAnimStep 	= 0.005;	// speed at which chamber opens

// camera animation with mouse input
var mouseDownLeft = false;
var mouseDownRight = false;
var mousePosOnClickY = 0;
var mousePosOnClickX = 0;
var mouseTranslateY = 0;
var mouseTranslateX = 0;
var mousePhi = 0;
var mouseTheta = 0;

// camera stuff
var sceneZoomFactor = 1;
var camRad = 1;

function main()
{
	setupWebGL();

	document.getElementById("thetaup").addEventListener("click", function(event)
	{
		mouseTheta += 5 * Math.PI / 180;
	});

	document.getElementById("thetadown").addEventListener("click", function(event)
	{
		mouseTheta -= 5 * Math.PI / 180;
	});

	document.getElementById("phiup").addEventListener("click", function(event)
	{
		mousePhi += 5 * Math.PI / 180;
	});

	document.getElementById("phidown").addEventListener("click", function(event)
	{
		mousePhi -= 5 * Math.PI / 180;
	});

	window.addEventListener
	(
		"keydown",
		function(event)
		{
			switch(String.fromCharCode(event.keyCode).toLowerCase())
			{
				case "a": 
					animate = !animate; 
					sounds.forEach( (sound) => sound.pause() );
					break;

				case "b":
					mouseTranslateX = 0;
					mouseTranslateY = 0;
					mousePhi = 0;
					mouseTheta = 0;
					sceneZoomFactor = 1;
					break;
			}
		}
	);

	document.getElementById("gl-canvas").addEventListener("mousedown", function(event)
	{
		if 		(event.which == 1)
		{
			mouseDownLeft = true;
			mouseDownRight = false;
			mousePosOnClickY = event.y;
			mousePosOnClickX = event.x;
		}
		else if (event.which == 3)
		{
			mouseDownLeft = false;
			mouseDownRight = true;
			mousePosOnClickY = event.y;
			mousePosOnClickX = event.x;
		}
	});

	document.addEventListener("mouseup", function(event)
	{
		mouseDownLeft = false;
		mouseDownRight = false;
	});

	document.addEventListener("mousemove", function(event)
	{
		if 		(mouseDownRight)
		{
			mouseTranslateX += (event.x - mousePosOnClickX) / 30;
			mousePosOnClickX = event.x;

			mouseTranslateY += (event.y - mousePosOnClickY) / 30;
			mousePosOnClickY = event.y;
		}
		else if (mouseDownLeft)
		{
			mousePhi += (event.x - mousePosOnClickX) / 10;
			mousePosOnClickX = event.x;

			mouseTheta += (event.y - mousePosOnClickY) / 10;
			mousePosOnClickY = event.y;
		}
	});

	document.getElementById("gl-canvas").addEventListener("wheel", function(event)
	{
		if (event.wheelDelta > 0)
			sceneZoomFactor = Math.max(0.1, sceneZoomFactor - 0.3);
		else
			sceneZoomFactor += 0.3;
	});

	render();
}

function render()
{
	gl.clearColor(10 / 255, 10 / 255, 10 / 255, 1.0);	// background to a dark-ish blue
	gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

	//let eye = vec3(1 + camRad * Math.cos(mousePhi), -3.25 + camRad * Math.sin(mouseTheta), 2 + camRad * Math.sin(mousePhi));
	let eye = vec3(2, -3.25, 2);
	let at	= vec3(0, -4, 0);
	let up	= vec3(0, 1, 0);
	mvMat = lookAt(eye, at, up);
	projMat = ortho
	(
		-10 * sceneZoomFactor - mouseTranslateX, 
		10 * sceneZoomFactor - mouseTranslateX, 
		-10 * sceneZoomFactor - mouseTranslateY, 
		10 * sceneZoomFactor - mouseTranslateY, 
		-40, 
		50
	);

	mvMatStack.push(mvMat);
	let yOffs = -8;
	let t = translate(0, yOffs, 0);
	let rx = rotate(mouseTheta, -1, 0, 0);
	let ry = rotate(mousePhi, 0, 1, 0);
	let rz = rotate(mouseTheta, 0, 0, 1);
	mvMat = mult(mvMat, t);
	mvMat = mult(mvMat, mult(rz, mult(rx, ry)));
	gl.uniformMatrix4fv(projMatLoc, false, flatten(projMat));
	drawScene();	
	mvMat = mvMatStack.pop();

	setTimeout(function() {requestAnimFrame(render)}, 5);
}

function animateScene()
{
	// control animation
	if (animate)
	{
		hpRotationSpeedStep = hpRotationSpeedMax / 250;

		if 		(animProg < 250)
		{
			// enable rotation of holoprojector
			hpRotateUpAnim = true;
			sounds[1].play();
		}
		else if (animProg < 500)
		{
			// switch rotation modes
			hpRotateUpAnim = false;
			hpRotateAnim = true;

			// enable holoprojector lasers
			hpLasersOn = true;
			sounds[0].play();

			// enable vertical holoprojector movement
			hpHeightAnim = true;
		}
		else if (hpHeightCycle == hpHeightCycleMax && animProg < 1000)
		{
			// switch rotation modes
			hpRotateAnim = false;

			hpRotateDownAnim = true;
			sounds[4].play();

			hpLasersOn = false;
			sounds[0].pause();

			hpHeightAnim = false;
		}
		else if (hpRotationSpeed == 0)
		{
			openCryoAnim = true;
			if (cryoAnimProg < cryoAnimMax / 2)
				sounds[2].play();
		}

		if (hpRotateUpAnim)
		{
			hpRotation += hpRotationSpeed;
			hpRotationSpeed = (hpRotationSpeed < hpRotationSpeedMax) ? hpRotationSpeed + hpRotationSpeedStep : hpRotationSpeed;	// slowly speed rotation up to max
		}
		
		if (hpRotateAnim)
		{
			hpRotationSpeed = hpRotationSpeedMax;
			hpRotation += hpRotationSpeed;
		}

		if (hpRotateDownAnim)
		{
			hpRotationSpeed = (hpRotationSpeed > 0) ? hpRotationSpeed - hpRotationSpeedStep : 0;
			hpRotation += hpRotationSpeed;
		}

		if (hpHeightAnim)
		{
			if 		(hpHeight >= hpHeightMaxOffs)
			{
				hpHeightStep = -hpHeightStep;
			}
			else if (hpHeight < 0)
			{
				hpHeightStep = -hpHeightStep;
				hpHeightCycle++;
			}

			hpHeight += hpHeightStep;
		}

		if (openCryoAnim)
		{
			cryoAnimProg = (cryoAnimProg < cryoAnimMax) ? cryoAnimProg + cryoAnimStep : cryoAnimMax;
		}

		animProg++;	
	}
}

var theta = 0;
function drawScene()
{
	let t, r, s; 

	animateScene();

	// room half cylinder with window
	/*
	lightPosition = vec4(0, 0, -5, 1);
	materialAmbient = vec4(0.5, 0.5, 0.5, 1);
	materialDiffuse = vec4(1, 1, 1, 1);
	materialSpecular = vec4(0.5, 0.5, 0.5, 1);
	materialShininess = 10;
	*/
	lightPosition = vec4(0, 0, 10, 1);
	materialAmbient = vec4(1, 1, 1, 1);
	materialDiffuse = vec4(1, 1, 1, 1);
	materialSpecular = vec4(1, 1, 1, 1);
	materialShininess = 7;
	setupLightingMaterial();

	mvMatStack.push(mvMat);
	t = translate(0, 0, 0);
	r = rotate(50, 0, 1, 0);
	s = scale4(12, 10, 12);
	mvMat = mult(mvMat, mult(t, mult(r, s)));
	gl.uniform1i(gl.getUniformLocation(program, "texture"), 2);
	gl.uniformMatrix4fv(mvMatLoc, false, flatten(mvMat));
	drawRoom_halfCylinder_window();
	mvMat = mvMatStack.pop();

	mvMatStack.push(mvMat);
	t = translate(0, 10, 0);
	r = rotate(50, 0, 1, 0);
	s = scale4(12, 10, 12);
	mvMat = mult(mvMat, mult(t, mult(r, s)));
	gl.uniformMatrix4fv(mvMatLoc, false, flatten(mvMat));
	drawRoom_halfCylinder();
	mvMat = mvMatStack.pop();

	// skybox that hangs out behind planets and stars
	lightPosition = vec4(0, 0, 5, 1);
	materialAmbient = vec4(1, 1, 1, 1);
	materialDiffuse = vec4(1, 1, 1, 1);
	materialSpecular = vec4(1, 1, 1, 1);
	materialShininess = 50;
	setupLightingMaterial();

	mvMatStack.push(mvMat);
	t = translate(-30, -1, -30);
	r = rotate(50, 0, 1, 0);
	s = scale4(12, 9, 9);
	mvMat = mult(mvMat, mult(t, mult(r, s)));
	gl.uniform1i(gl.getUniformLocation(program, "texture"), 5);
	gl.uniformMatrix4fv(mvMatLoc, false, flatten(mvMat));
	drawSkybox_Wall();
	mvMat = mvMatStack.pop();

	// red carpet leading away from cryo tube
	lightPosition = vec4(0, 2, 0, 1);
	materialAmbient = vec4(200 / 255, 30 / 255, 40 / 255, 1);
	materialDiffuse = vec4(200 / 255, 30 / 255, 40 / 255, 1);
	materialSpecular = vec4(0.5, 0.5, 0.5, 1);
	materialShininess = 30;
	setupLightingMaterial();
	
	mvMatStack.push(mvMat);
	t = translate(3 * 2.5, -0.01, 5 * 2.5);
	r = rotate(-60, 0, 1, 0);
	s = scale4(12, 1, 2);
	mvMat = mult(mvMat, mult(t, mult(r, s)));
	gl.uniform1i(gl.getUniformLocation(program, "texture"), 1);
	gl.uniformMatrix4fv(mvMatLoc, false, flatten(mvMat));
	drawPath();
	mvMat = mvMatStack.pop();

	// planet outside of window
	lightPosition = vec4(10, 2, -5, 1);
	// change light specular here?
	//materialAmbient = vec4(28 / 255, 221 / 255, 134 / 255, 1);
	//materialDiffuse = vec4(28 / 255, 221 / 255, 134 / 255, 1);
	//materialSpecular = vec4(0.5, 0.5, 0.5, 1);
	materialAmbient = vec4(1, 1, 1, 1);
	materialDiffuse = vec4(1, 1, 1, 1);
	materialSpecular = vec4(1, 1, 1, 1);
	materialShininess = 20;
	setupLightingMaterial();

	mvMatStack.push(mvMat);
	t = translate(-25, 0, -15);
	r = rotate(theta, 1, 1, 0);
	s = scale4(4, 4, 4);
	mvMat = mult(mvMat, mult(t, mult(r, s)));
	gl.uniform1i(gl.getUniformLocation(program, "texture"), 0);
	gl.uniformMatrix4fv(mvMatLoc, false, flatten(mvMat));
	drawSphere();
	mvMat = mvMatStack.pop();

	// floor
	lightPosition = vec4(0, 2, 0, 1);
	materialAmbient = vec4(1, 1, 1, 1);
	materialDiffuse = vec4(1, 1, 1, 1);
	materialSpecular = vec4(1, 1, 1, 1);
	materialShininess = 8;
	setupLightingMaterial();

	mvMatStack.push(mvMat);
	t = translate(6, -0.05, 5);
	r = rotate(50, 0, 1, 0);
	s = scale4(15, 1, 25);
	mvMat = mult(mvMat, mult(t, mult(r, s)));
	gl.uniform1i(gl.getUniformLocation(program, "texture"), 6);
	gl.uniformMatrix4fv(mvMatLoc, false, flatten(mvMat));
	drawFloor();
	mvMat = mvMatStack.pop();

	// stars outside window
	gl.uniform1i(gl.getUniformLocation(program, "texture"), 9);
	drawStarField();

	// lighting, material for holodeck base
	lightPosition = (hpLasersOn) ? vec4(0.5, 4, 0, 1) : vec4(0.5, 2, 0, 1);
	materialAmbient = vec4(0.35, 0.35, 0.35, 1);
	materialDiffuse = (hpLasersOn) ? vec4(0.8, 0.45, 0.45, 1) : vec4(0.75, 0.75, 0.75, 1);
	materialSpecular = vec4(0.3, 0.25, 0.37, 1);
	materialShininess = 10;
	setupLightingMaterial();

	// transformations and drawing for holodeck base
	mvMatStack.push(mvMat);
	t = translate(0, 0, 0);
	s = scale4(0.45, 0.45, 0.45);
	mvMat = mult(mult(mvMat, t), s);
	gl.uniform1i(gl.getUniformLocation(program, "texture"), 7);
	gl.uniformMatrix4fv(mvMatLoc, false, flatten(mvMat));
	drawHolodeckBase();
	mvMat = mvMatStack.pop();

	// reset lighting
	lightPosition = vec4(0, 4, 0, 1);

	// transformations and drawing for holoprojector
	mvMatStack.push(mvMat);
	t = translate(0, 2 + hpHeight, 0);
	r = rotate(hpRotation + 30, 0, 1, 0);
	s = scale4(1.25, 1.25, 1.25);
	mvMat = mult(mvMat, mult(t, mult(r, s)));
	gl.uniform1i(gl.getUniformLocation(program, "texture"), 3);
	gl.uniformMatrix4fv(mvMatLoc, false, flatten(mvMat));
	drawHoloProjector();
	mvMat = mvMatStack.pop();

	// lighting for alien
    //materialAmbient = vec4(.2, .2, .2, 1);
    //materialDiffuse = vec4(160 / 255, 152 / 255, 155 / 255, 1);
    //materialSpecular = vec4(.5, .5, .5, 1);
	materialAmbient = vec4(1, 1, 1, 1);
	materialDiffuse = vec4(1, 1, 1, 1);
	materialSpecular = vec4(1, 1, 1, 1);
	materialShininess = 10;
    setupLightingMaterial();

    //draws the alien
    mvMatStack.push(mvMat);
	t = translate(0, 3, 0);
	r = rotate(30, 0, 1, 0);
	s = scale4(0.75, 0.75, 0.75);
	mvMat = mult(mvMat, mult(t, mult(r, s)));
	gl.uniform1i(gl.getUniformLocation(program, "texture"), 10);
    drawAlien();
    mvMat = mvMatStack.pop();

    //lighting for chamber
	lightPosition = vec4(-1, 1, 1, 1);
    materialAmbient = vec4(.75, .75, .75, 1);
    materialDiffuse = (hpLasersOn) ? vec4(0.75, 0.5, 0.52, 1) : vec4(0.63, 0.6, 0.61, 1);
	materialSpecular = vec4(0.3, 0.25, 0.37, 1);
    setupLightingMaterial();

    //Animation of chamber opening
    mvMatStack.push(mvMat);
	t = translate(0, 3.5, 0.5);
	r = rotate(120, 0, 1, 0);
	s = scale4(1.25, 1, 1.25);
    mvMat = mult(mvMat, mult(t, mult(r, s)));
	gl.uniform1i(gl.getUniformLocation(program, "texture"), 8);
	gl.uniformMatrix4fv(mvMatLoc, false, flatten(mvMat));
	drawChamber(cryoAnimProg);
	mvMat = mvMatStack.pop();

	// reset light position
	lightPosition = vec4(0, 4, 0, 1);

	theta++;
}

let starPositions = [];
let starRots = [];
function drawStarField()
{
	// star outside window
	lightPosition = vec4(3, 2, 0, 1);
	materialAmbient = vec4(1, 1, 0, 1);
	materialDiffuse = vec4(1, 1, 0, 1);
	materialSpecular = vec4(0.5, 0.5, 0.5, 1);
	materialShininess = 5;
	setupLightingMaterial();

	for (let i = 0; i < 50; i++)
	{
		if (typeof starPositions[i] === 'undefined')
		{
			starPositions.push
			(
				vec4
				(
					Math.floor(Math.random() * (-35 + 20 + 1) - 20),
					Math.floor(Math.random() * (4 + 4 + 1) - 4),
					Math.floor(Math.random() * (-35 + 20 + 1) - 20)
				)
			);
		}

		if (typeof starRots[i] === 'undefined')
			starRots.push(vec4(Math.random(), Math.random(), Math.random()));

		mvMatStack.push(mvMat);
		//t = translate(-12, 0, -20);
		t = translate(starPositions[i][0], starPositions[i][1], starPositions[i][2]);
		//r = rotate(theta * 3, 1, 1, 1);
		r = rotate(theta * 3, starRots[i][0], starRots[i][1], starRots[i][2]);
		s = scale4(0.035, 0.035, 0.035);
		mvMat = mult(mvMat, mult(t, mult(r, s)));
		gl.uniformMatrix4fv(mvMatLoc, false, flatten(mvMat));
		drawExtrudedStar();
		mvMat = mvMatStack.pop();
	}
}

/*
 * WRITTEN BY ISAAC
 *
 * modified by Ryan to work in this implementation
 */
function drawChamber(x)
{
    var t, r, s;

	// front
	// bottom
	mvMatStack.push(mvMat);
	s = scale4(0.5, 0.5, 0.5);
	r = rotate(90, 1, 0, 0);
	t = translate(0, 0, x);
	mvMat = mult(mvMat, mult(t, mult(r, s)));
	gl.uniformMatrix4fv(mvMatLoc, false, flatten(mvMat));
	drawCryo();
	mvMat = mvMatStack.pop();

	// top
	mvMatStack.push(mvMat);
	s = scale4(0.5, -0.5, 0.5);
	r = rotate(-90, 1, 0, 0);
	t = translate(0, 0, x);
	mvMat = mult(mvMat, mult(t, mult(r, s)));
	gl.uniformMatrix4fv(mvMatLoc, false, flatten(mvMat));
	drawCryo();
	mvMat = mvMatStack.pop();

	// back
	// bottom
	mvMatStack.push(mvMat);
	s = scale4(0.5, -0.5, 0.5);
	r = rotate(90, 1, 0, 0);
	t = translate(0, 0, -x);
	mvMat = mult(mvMat, mult(t, mult(r, s)));
	gl.uniformMatrix4fv(mvMatLoc, false, flatten(mvMat));
	drawCryo();
	mvMat = mvMatStack.pop();

	// top
	mvMatStack.push(mvMat);
	s = scale4(0.5, 0.5, 0.5);
	r = rotate(-90, 1, 0, 0);
	t = translate(0, 0, -x);
	mvMat = mult(mvMat, mult(t, mult(r, s)));
	gl.uniformMatrix4fv(mvMatLoc, false, flatten(mvMat));
	drawCryo();
	mvMat = mvMatStack.pop();
}

/*
 * WRITTEN BY ISAAC
 *
 * modified by Ryan to work in this implementation
 */
function drawAlien()
{
	let r, t, s;

    //head
    materialAmbient = vec4(.2, .2, .2, 1);
    materialDiffuse = vec4(114 / 255, 232 / 255, 78 / 255, 1);
    materialSpecular = vec4(.5, .5, .5, 1);
    setupLightingMaterial();

    mvMatStack.push(mvMat);
	t = translate(0, 1, 0);
	s = scale4(0.5, 1, 0.5, 1);
	mvMat = mult(mvMat, mult(t, s));
	gl.uniformMatrix4fv(mvMatLoc, false, flatten(mvMat));
	drawSphere();
    mvMat = mvMatStack.pop();

    //antenna
	mvMatStack.push(mvMat);
	t = translate(0, 0, 0);
	//s = scale4(0.5, 1, 0.5, 1);
	s = scale4(4, 4, 4);
	mvMat = mult(mvMat, mult(t, s));
	gl.uniformMatrix4fv(mvMatLoc, false, flatten(mvMat));
	drawAlienAntenna();
	mvMat = mvMatStack.pop();

    //left eye
    materialAmbient = vec4(0, 0, 0, 1);
    materialDiffuse = vec4(0, 0, 0, 1);
    materialSpecular = vec4(0, 0, 0, 1);
    setupLightingMaterial();

    mvMatStack.push(mvMat);
	r = rotate(-50, 0, 0, 1);
	t = translate(0.2, 1, 0.25); 
	s = scale4(0.25, 0.35, 0.25, 1);
	mvMat = mult(mvMat, mult(t, mult(rotate(-30, 1, 0, 0), mult(r, s))));
	gl.uniformMatrix4fv(mvMatLoc, false, flatten(mvMat));
	drawSphere();
    mvMat = mvMatStack.pop();

    //right eye
    mvMatStack.push(mvMat);
	r = rotate(50, 0, 0, 1);
	t = translate(-0.2, 1, 0.25);
	s = scale4(0.25, 0.35, 0.25, 1);
	mvMat = mult(mvMat, mult(t, mult(rotate(-30, 1, 0, 0), mult(r, s))));
	gl.uniformMatrix4fv(mvMatLoc, false, flatten(mvMat));
	drawSphere();
    mvMat = mvMatStack.pop();

    //neck
    materialAmbient = vec4(.2, .2, .2, 1);
    materialDiffuse = vec4(114 / 255, 232 / 255, 78 / 255, 1);
    materialSpecular = vec4(.5, .5, .5, 1);
    setupLightingMaterial();

    mvMatStack.push(mvMat);
	t = translate(0, 0, 0);
	s = scale4(0.1, 0.25, 0.1, 1);
	mvMat = mult(mvMat, mult(t, s));
	gl.uniformMatrix4fv(mvMatLoc, false, flatten(mvMat));
	drawCube();
    mvMat = mvMatStack.pop();

    //body
    mvMatStack.push(mvMat);
	t = translate(0, -0.85, 0);
	s = scale4(0.5, 0.6, 0.1, 1);
	mvMat = mult(mvMat, mult(t, s));
	gl.uniformMatrix4fv(mvMatLoc, false, flatten(mvMat));
	drawCube();
    mvMat = mvMatStack.pop();

    //left shoulder
    mvMatStack.push(mvMat);
	t = translate(-0.7, -0.35, 0);
	s = scale4(0.2, 0.1, 0.1, 1);
	mvMat = mult(mvMat, mult(t, s));
	gl.uniformMatrix4fv(mvMatLoc, false, flatten(mvMat));
	drawCube();
    mvMat = mvMatStack.pop();

    //left arm 
    mvMatStack.push(mvMat);
	t = translate(-1, 0, 0);
	r = rotate(20, 0, 0, 1);
	s = scale4(0.1, 0.4, 0.099, 1);
	mvMat = mult(mvMat, mult(t, mult(r, s)));
	gl.uniformMatrix4fv(mvMatLoc, false, flatten(mvMat));
	drawCube();
    mvMat = mvMatStack.pop();

    //left hand
    //finger 1
    mvMatStack.push(mvMat);
	t = translate(-1.3, 0.45, 0);
	r = rotate(30, 0, 0, 1);
	s = scale4(0.05, 0.2, 0.1);
	mvMat = mult(mvMat, mult(t, mult(r, s)));
	gl.uniformMatrix4fv(mvMatLoc, false, flatten(mvMat));
	drawCube();
    mvMat = mvMatStack.pop();

    //finger 2
    mvMatStack.push(mvMat);
	t = translate(-1.19, 0.5, 0);
	r = rotate(15, 0, 0, 1);
	s = scale4(0.05, 0.2, 0.1);
	mvMat = mult(mvMat, mult(t, mult(r, s)));
	gl.uniformMatrix4fv(mvMatLoc, false, flatten(mvMat));
	drawCube();
    mvMat = mvMatStack.pop();

    //finger 3
    mvMatStack.push(mvMat);
	t = translate(-1.07, 0.52, 0);
	r = rotate(0, 0, 0, 1);
	s = scale4(0.05, 0.2, 0.1);
	mvMat = mult(mvMat, mult(t, mult(r, s)));
	gl.uniformMatrix4fv(mvMatLoc, false, flatten(mvMat));
	drawCube();
    mvMat = mvMatStack.pop();

    //right shoulder
    mvMatStack.push(mvMat);
	t = translate(0.7, -0.35, 0);
	s = scale4(0.2, 0.1, 0.1, 1);
	mvMat = mult(mvMat, mult(t, s));
	gl.uniformMatrix4fv(mvMatLoc, false, flatten(mvMat));
	drawCube();
    mvMat = mvMatStack.pop();

    //right arm
    mvMatStack.push(mvMat);
	t = translate(0.8, -0.85, 0);
	s = scale4(0.1, 0.4, 0.1, 1);
	mvMat = mult(mvMat, mult(t, s));
	gl.uniformMatrix4fv(mvMatLoc, false, flatten(mvMat));
	drawCube();
    mvMat = mvMatStack.pop();

    //left leg
    mvMatStack.push(mvMat);
	t = translate(-0.2, -1.85, 0);
	s = scale4(0.1, 0.4, 0.1, 1);
	mvMat = mult(mvMat, mult(t, s));
	gl.uniformMatrix4fv(mvMatLoc, false, flatten(mvMat));
	drawCube();
    mvMat = mvMatStack.pop();

    //right leg
    mvMatStack.push(mvMat);
	t = translate(0.2, -1.85, 0);
	s = scale4(0.1, 0.4, 0.1, 1);
	mvMat = mult(mvMat, mult(t, s));
	gl.uniformMatrix4fv(mvMatLoc, false, flatten(mvMat));
	drawCube();
    mvMat = mvMatStack.pop();
}

function drawHoloProjector()
{
	let t, r, s;

	/*
	 * ARMS 
	 */
	let radius = 3;

	lightPosition = vec4(0.5, 0.5, 0, 1);
	//materialAmbient = vec4(81/255, 60/255, 46/255, 1);
	materialAmbient = vec4(1, 1, 1, 1);
	//materialDiffuse = vec4(0.1, 0.1, 0.1, 1);
	materialDiffuse = vec4(1, 1, 1, 1);
	//materialSpecular = vec4(0.5, 0.5, 0.5, 1);
	materialSpecular = vec4(1, 1, 1, 1);
	materialShininess = 20;
	setupLightingMaterial();

	mvMatStack.push(mvMat);
	t = translate(radius * Math.cos(0), 0, radius * Math.sin(0));
	r = rotate(0, 0, 1, 0);
	s = scale4(0.25, 0.25, 0.25);
	mvMat = mult(mvMat, mult(t, mult(r, s)));
	gl.uniformMatrix4fv(mvMatLoc, false, flatten(mvMat));
	drawHoloProjectorArm();
	mvMat = mvMatStack.pop();

	mvMatStack.push(mvMat);
	t = translate(radius * Math.cos(2 * Math.PI / 3), 0, radius * Math.sin(2 * Math.PI / 3));
	r = rotate(-120, 0, 1, 0);
	s = scale4(0.25, 0.25, 0.25);
	mvMat = mult(mvMat, mult(t, mult(r, s)));
	gl.uniformMatrix4fv(mvMatLoc, false, flatten(mvMat));
	drawHoloProjectorArm();
	mvMat = mvMatStack.pop();

	mvMatStack.push(mvMat);
	t = translate(radius * Math.cos(4 * Math.PI / 3), 0, radius * Math.sin(4 * Math.PI / 3));
	r = rotate(-240, 0, 1, 0);
	s = scale4(0.25, 0.25, 0.25);
	mvMat = mult(mvMat, mult(t, mult(r, s)));
	gl.uniformMatrix4fv(mvMatLoc, false, flatten(mvMat));
	drawHoloProjectorArm();
	mvMat = mvMatStack.pop();

	/*
	 * LASERS CONNECTING TO PROJECTORS
	 */
	if (hpLasersOn)
	{
		gl.uniform1i(gl.getUniformLocation(program, "texture"), 4);

		// light is now at center of each laser
		lightPosition = vec4(0, 1, 0);
		materialAmbient = vec4(0.75, 0.1, 0.05, 1);
		materialDiffuse = vec4(1.0, 0.1, 0.05, 1);
		materialSpecular = vec4(1.0, 0.0, 0.0, 1);
		materialShininess = 5;
		setupLightingMaterial();

		let thickness = Math.floor(Math.random() * (8 - 3 + 1) + 3) / 100; // between 0.03 and 0.08
		let len = 2.5; // length of laser beam

		mvMatStack.push(mvMat);
		t = translate(radius * Math.cos(0), -0.3, radius * Math.sin(0));
		r = mult(rotate(-90, 0, 1, 0), rotate(90, 1, 0, 0));
		s = scale4(thickness, len, thickness);
		mvMat = mult(mvMat, mult(t, mult(r, s)));
		gl.uniformMatrix4fv(mvMatLoc, false, flatten(mvMat));
		drawLaserBeam();
		mvMat = mvMatStack.pop();

		mvMatStack.push(mvMat);
		t = translate(radius * Math.cos(2 * Math.PI / 3), -0.3, radius * Math.sin(2 * Math.PI / 3));
		r = mult(rotate(90 + 60, 0, 1, 0), rotate(90, 1, 0, 0));
		s = scale4(thickness, len, thickness);
		mvMat = mult(mvMat, mult(t, mult(r, s)));
		gl.uniformMatrix4fv(mvMatLoc, false, flatten(mvMat));
		drawLaserBeam();
		mvMat = mvMatStack.pop();

		mvMatStack.push(mvMat);
		t = translate(radius * Math.cos(4 * Math.PI / 3), -0.3, radius * Math.sin(4 * Math.PI / 3));
		r = mult(rotate(90 - 60, 0, 1, 0), rotate(90, 1, 0, 0));
		s = scale4(thickness, len, thickness);
		mvMat = mult(mvMat, mult(t, mult(r, s)));
		gl.uniformMatrix4fv(mvMatLoc, false, flatten(mvMat));
		drawLaserBeam();
		mvMat = mvMatStack.pop();
	}

	/*
	 * TUBE THING
	 */
	// texture
	gl.uniform1i(gl.getUniformLocation(program, "texture"), 3);

	// lighting and materials for tube thing
	lightPosition = vec4(0, -0.5, 0, 1);
	//materialAmbient = vec4(40/255, 30/255, 23/255, 1);
	//materialDiffuse = vec4(0.2, 0.2, 0.2, 1);
	//materialSpecular = vec4(0.5, 0.5, 0.5, 1);
	materialAmbient = vec4(1, 1, 1, 1);
	materialDiffuse = vec4(1, 1, 1, 1);
	materialSpecular = vec4(1, 1, 1 ,1);
	materialShininess = 20;
	setupLightingMaterial();

	// transformations and drawing for tube thing
	mvMatStack.push(mvMat);
	t = translate(0, 4.5, 0);
	r = rotate(30, 0, 1, 0);
	s = scale4(1, 2, 1);
	mvMat = mult(mvMat, mult(t, mult(r, s)));
	gl.uniformMatrix4fv(mvMatLoc, false, flatten(mvMat));
	drawHexagonalPrism();
	mvMat = mvMatStack.pop();

	/*
	 *	SMALLER TUBE THING
	 */
	//materialAmbient = vec4(40/255, 30/255, 23/255, 1);
	//materialDiffuse = vec4(0.2, 0.2, 0.2, 1);
	//materialSpecular = vec4(0.5, 0.5, 0.5, 1);
	//materialShininess = 20;
	//setupLightingMaterial();

	// transformations and drawing for smaller tube thing
	mvMatStack.push(mvMat);
	t = translate(0, 6, 0);
	r = rotate(30, 0, 1, 0);
	s = scale4(0.7, 6, 0.7);
	mvMat = mult(mvMat, mult(t, mult(r, s)));
	gl.uniformMatrix4fv(mvMatLoc, false, flatten(mvMat));
	drawHexagonalPrism();
	mvMat = mvMatStack.pop();
	

	// reset light position
	lightPosition = vec4(0, 4, 0, 1);
	setupLightingMaterial();
}

function drawHoloProjectorArm()
{
	let t, r, s;

	/*
	 * DRAWING "FOOT"
	 */

	// left "toe"
	mvMatStack.push(mvMat);
	t = translate(0, 0, -1.5);
	s = scale4(1.5, 1, 1);
	mvMat = mult(mvMat, mult(t, s));
	gl.uniformMatrix4fv(mvMatLoc, false, flatten(mvMat));
	drawSlopeCubeCorner();
	mvMat = mvMatStack.pop();

	// left toe below
	mvMatStack.push(mvMat);
	t = translate(0, -2, -1.5);
	s = scale4(1.5, -0.5, 1);
	mvMat = mult(mvMat, mult(t, s));
	gl.uniformMatrix4fv(mvMatLoc, false, flatten(mvMat));
	drawSlopeCubeCorner();
	mvMat = mvMatStack.pop();

	// right "toe"
	mvMatStack.push(mvMat);
	t = translate(0, 0, 1.5);
	r = rotate(90, 0, 1, 0);
	s = scale4(1, 1, 1.5);
	mvMat = mult(mvMat, mult(t, mult(r, s)));
	gl.uniformMatrix4fv(mvMatLoc, false, flatten(mvMat));
	drawSlopeCubeCorner();
	mvMat = mvMatStack.pop();

	// right toe below
	mvMatStack.push(mvMat);
	t = translate(0, -2, 1.5);
	r = rotate(90, 0, 1, 0);
	s = scale4(1, -0.5, 1.5);
	mvMat = mult(mvMat, mult(t, mult(r, s)));
	gl.uniformMatrix4fv(mvMatLoc, false, flatten(mvMat));
	drawSlopeCubeCorner();
	mvMat = mvMatStack.pop();

	// middle "toe"
	mvMatStack.push(mvMat);
	t = translate(0, -0.5, 0);
	r = rotate(90, 0, 1, 0);
	s = scale4(0.5, 0.5, 1.5);
	mvMat = mult(mvMat, mult(t, mult(r, s)));
	gl.uniformMatrix4fv(mvMatLoc, false, flatten(mvMat));
	drawSlopeCubeMid();
	mvMat = mvMatStack.pop();

	// middle toe below
	mvMatStack.push(mvMat);
	t = translate(0, -2, 0);
	r = rotate(90, 0, 1, 0);
	s = scale4(0.5, -0.5, 1.5);
	mvMat = mult(mvMat, mult(t, mult(r, s)));
	gl.uniformMatrix4fv(mvMatLoc, false, flatten(mvMat));
	drawSlopeCubeMid();
	mvMat = mvMatStack.pop();

	// left "toe" extension
	mvMatStack.push(mvMat);
	t = translate(2, -0.5, -1.5);
	s = scale4(0.5, 0.5, 1);
	mvMat = mult(mvMat, mult(t, s));
	gl.uniformMatrix4fv(mvMatLoc, false, flatten(mvMat));
	drawSlopeCubeMid();
	mvMat = mvMatStack.pop();

	// left toe extension 2
	mvMatStack.push(mvMat);
	t = translate(4, -0.5, -1.5);
	s = scale4(0.5, 0.5, 1);
	mvMat = mult(mvMat, mult(t, s));
	gl.uniformMatrix4fv(mvMatLoc, false, flatten(mvMat));
	drawSlopeCubeMid();
	mvMat = mvMatStack.pop();

	// let toe extension below
	mvMatStack.push(mvMat);
	t = translate(2.5, -2, -1.5);
	s = scale4(1, -0.5, 1);
	mvMat = mult(mvMat, mult(t, s));
	gl.uniformMatrix4fv(mvMatLoc, false, flatten(mvMat));
	drawSlopeCubeMid();
	mvMat = mvMatStack.pop();

	// right "toe" extension
	mvMatStack.push(mvMat);
	t = translate(2, -0.5, 1.5);
	r = rotate(180, 0, 1, 0);
	s = scale4(0.5, 0.5, 1);
	mvMat = mult(mvMat, mult(t, mult(r, s)));
	gl.uniformMatrix4fv(mvMatLoc, false, flatten(mvMat));
	drawSlopeCubeMid();
	mvMat = mvMatStack.pop();

	// right toe extension 2
	mvMatStack.push(mvMat);
	t = translate(4, -0.5, 1.5);
	r = rotate(180, 0, 1, 0);
	s = scale4(0.5, 0.5, 1);
	mvMat = mult(mvMat, mult(t, mult(r, s)));
	gl.uniformMatrix4fv(mvMatLoc, false, flatten(mvMat));
	drawSlopeCubeMid();
	mvMat = mvMatStack.pop();

	// right toe extension below
	mvMatStack.push(mvMat);
	t = translate(2.5, -2, 1.5);
	r = rotate(180, 0, 1, 0);
	s = scale4(1, -0.5, 1);
	mvMat = mult(mvMat, mult(t, mult(r, s)));
	gl.uniformMatrix4fv(mvMatLoc, false, flatten(mvMat));
	drawSlopeCubeMid();
	mvMat = mvMatStack.pop();

	// left bottom connection to top
	mvMatStack.push(mvMat);
	t = translate(3, -0.75, -1.5);
	s = scale4(0.5, 0.75, 1);
	mvMat = mult(mvMat, mult(t, s));
	gl.uniformMatrix4fv(mvMatLoc, false, flatten(mvMat));
	drawSlopeCubeMid();
	mvMat = mvMatStack.pop();

	// right bottom connection to top
	mvMatStack.push(mvMat);
	t = translate(3, -0.75, 1.5);
	r = rotate(180, 0, 1, 0);
	s = scale4(0.5, 0.75, 1);
	mvMat = mult(mvMat, mult(t, mult(r, s)));
	gl.uniformMatrix4fv(mvMatLoc, false, flatten(mvMat));
	drawSlopeCubeMid();
	mvMat = mvMatStack.pop();
	
	// bottom back left fill
	mvMatStack.push(mvMat);
	t = translate(4, -1.5, -1.5);
	r = rotate(180, 0, 1, 0);
	s = scale4(0.5, 0.5, 1);
	mvMat = mult(mvMat, mult(t, mult(rotate(180, 1, 0, 0), mult(r, s))));
	gl.uniformMatrix4fv(mvMatLoc, false, flatten(mvMat));
	drawSlopeCubeCorner();
	mvMat = mvMatStack.pop();
	
	// bottom back right fill
	mvMatStack.push(mvMat);
	t = translate(4, -1.5, 1.5);
	r = rotate(90, 0, 1, 0);
	s = scale4(1, 0.5, 0.5);
	mvMat = mult(mvMat, mult(t, mult(rotate(180, 0, 0, 1), mult(r, s))));
	gl.uniformMatrix4fv(mvMatLoc, false, flatten(mvMat));
	drawSlopeCubeCorner();
	mvMat = mvMatStack.pop();
	
	// middle of "foot"
	mvMatStack.push(mvMat);
	t = translate(2, 0, 0);
	s = scale4(0.5, 1, 0.5);
	mvMat = mult(mvMat, mult(t, s));
	gl.uniformMatrix4fv(mvMatLoc, false, flatten(mvMat));
	drawCube();
	mvMat = mvMatStack.pop();

	// back of "foot"
	mvMatStack.push(mvMat);
	t = translate(3, 0, 0);
	s = scale4(0.5, 1, 0.5);
	mvMat = mult(mvMat, mult(t, s));
	gl.uniformMatrix4fv(mvMatLoc, false, flatten(mvMat));
	drawCube();
	mvMat = mvMatStack.pop();

	// left connection to back
	mvMatStack.push(mvMat);
	t = translate(3, 1, -1);
	r = rotate(180, 1, 0, 0);
	s = scale4(0.5, 1, 0.5);
	mvMat = mult(mvMat, mult(t, mult(rotate(180, 0, 1, 0), mult(r, s))));
	gl.uniformMatrix4fv(mvMatLoc, false, flatten(mvMat));
	drawSlopeCubeMid();
	mvMat = mvMatStack.pop();

	// right connection to back
	mvMatStack.push(mvMat);
	t = translate(3, 1, 1);
	r = rotate(-180, 1, 0, 0);
	s = scale4(0.5, 1, 0.5);
	mvMat = mult(mvMat, mult(t, mult(r, s)));
	gl.uniformMatrix4fv(mvMatLoc, false, flatten(mvMat));
	drawSlopeCubeMid();
	mvMat = mvMatStack.pop();

	// back connection to back
	mvMatStack.push(mvMat);
	t = translate(4, 2, 0);
	r = rotate(180, 1, 0, 0);
	s = scale4(0.5, 1, 0.5);
	mvMat = mult(mvMat, mult(t, mult(rotate(90, 0, 1, 0), mult(r, s))));
	gl.uniformMatrix4fv(mvMatLoc, false, flatten(mvMat));
	drawSlopeCubeMid();
	mvMat = mvMatStack.pop();

	/*
	 * DRAWING "SHIN"
	 */

	// mid
	mvMatStack.push(mvMat);
	t = translate(3, 2, 0);
	s = scale4(0.5, 1, 0.5);
	mvMat = mult(mvMat, mult(t, s));
	gl.uniformMatrix4fv(mvMatLoc, false, flatten(mvMat));
	drawCube();
	mvMat = mvMatStack.pop();

	// front
	mvMatStack.push(mvMat);
	t = translate(2, 2, 0);
	s = scale4(0.5, 1, 0.5);
	mvMat = mult(mvMat, mult(t, s));
	gl.uniformMatrix4fv(mvMatLoc, false, flatten(mvMat));
	drawCube();
	mvMat = mvMatStack.pop();
	
	// left
	mvMatStack.push(mvMat);
	t = translate(3, 4, -1);
	s = scale4(0.5, 2, 0.5);
	mvMat = mult(mvMat, mult(t, s));
	gl.uniformMatrix4fv(mvMatLoc, false, flatten(mvMat));
	drawCube();
	mvMat = mvMatStack.pop();

	// right
	mvMatStack.push(mvMat);
	t = translate(3, 4, 1);
	s = scale4(0.5, 2, 0.5);
	mvMat = mult(mvMat, mult(t, s));
	gl.uniformMatrix4fv(mvMatLoc, false, flatten(mvMat));
	drawCube();
	mvMat = mvMatStack.pop();

	// back
	mvMatStack.push(mvMat);
	t = translate(4, 3.5, 0);
	s = scale4(0.5, 0.5, 0.5);
	mvMat = mult(mvMat, mult(t, s));
	gl.uniformMatrix4fv(mvMatLoc, false, flatten(mvMat));
	drawCube();
	mvMat = mvMatStack.pop();

	// mid slope
	mvMatStack.push(mvMat);
	t = translate(2.5, 3.5, 0);
	r = rotate(90, 1, 0, 0);
	s = scale4(0.5, 1, 0.5);
	mvMat = mult(mvMat, mult(t, mult(rotate(-90, 0, 1, 0), mult(r, s))));
	gl.uniformMatrix4fv(mvMatLoc, false, flatten(mvMat));
	drawSlopeCubeMid();
	mvMat = mvMatStack.pop();

	/*
	 * DRAWING "LEG"
	 */

	// back 
	mvMatStack.push(mvMat);
	t = translate(4, 9, 0);
	s = scale4(0.5, 5, 0.5);
	mvMat = mult(mvMat, mult(t, s));
	gl.uniformMatrix4fv(mvMatLoc, false, flatten(mvMat));
	drawCube();
	mvMat = mvMatStack.pop();


	// back left ornamentation
	mvMatStack.push(mvMat);
	t = translate(4, 5, -1);
	r = rotate(180, 0, 1, 0);
	s = scale4(0.5, 1, 0.5);
	mvMat = mult(mvMat, mult(t, mult(rotate(180, 1, 0, 0), mult(r, s))));
	gl.uniformMatrix4fv(mvMatLoc, false, flatten(mvMat));
	drawSlopeCubeCorner();
	mvMat = mvMatStack.pop();

	// back right ornamentation
	mvMatStack.push(mvMat);
	t = translate(4, 5, 1);
	r = rotate(90, 0, 1, 0);
	s = scale4(0.5, 1, 0.5);
	mvMat = mult(mvMat, mult(t, mult(rotate(180, 0, 0, 1), mult(r, s))));
	gl.uniformMatrix4fv(mvMatLoc, false, flatten(mvMat));
	drawSlopeCubeCorner();
	mvMat = mvMatStack.pop();

	// left slope
	mvMatStack.push(mvMat);
	t = translate(3, 6.5, -1);
	r = rotate(90, 0, 1, 0);
	s = scale4(0.5, 0.5, 0.5);
	mvMat = mult(mvMat, mult(t, mult(r, s)));
	gl.uniformMatrix4fv(mvMatLoc, false, flatten(mvMat));
	drawSlopeCubeMid();
	mvMat = mvMatStack.pop();

	// right slope
	mvMatStack.push(mvMat);
	t = translate(3, 6.5, 1);
	r = rotate(90, 0, 1, 0);
	s = scale4(0.5, 0.5, 0.5);
	mvMat = mult(mvMat, mult(t, mult(r, s)));
	gl.uniformMatrix4fv(mvMatLoc, false, flatten(mvMat));
	drawSlopeCubeMid();
	mvMat = mvMatStack.pop();

	// back left support
	mvMatStack.push(mvMat);
	t = translate(4, 8.5, -1);
	r = rotate(90, 0, 0, -1);
	s = scale4(2.5, 0.5, 0.5);
	mvMat = mult(mvMat, mult(t, mult(r, s)));
	gl.uniformMatrix4fv(mvMatLoc, false, flatten(mvMat));
	drawSlopeCubeMid();
	mvMat = mvMatStack.pop();

	// back right support
	mvMatStack.push(mvMat);
	t = translate(4, 8.5, 1);
	r = rotate(90, 0, 0, 1);
	s = scale4(2.5, 0.5, 0.5);
	mvMat = mult(mvMat, mult(t, mult(rotate(180, 0, 1, 0), mult(r, s))));
	gl.uniformMatrix4fv(mvMatLoc, false, flatten(mvMat));
	drawSlopeCubeMid();
	mvMat = mvMatStack.pop();

	// inverted back left ornamentation
	mvMatStack.push(mvMat);
	t = translate(4, 12, -1);
	r = rotate(-90, 0, 1, 0);
	s = scale4(0.5, 1, 0.5);
	mvMat = mult(mvMat, mult(t, mult(r, s)));
	gl.uniformMatrix4fv(mvMatLoc, false, flatten(mvMat));
	drawSlopeCubeCorner();
	mvMat = mvMatStack.pop();

	// inverted back right ornamentation
	mvMatStack.push(mvMat);
	t = translate(4, 12, 1);
	r = rotate(180, 0, 1, 0);
	s = scale4(0.5, 1, 0.5);
	mvMat = mult(mvMat, mult(t, mult(r, s)));
	gl.uniformMatrix4fv(mvMatLoc, false, flatten(mvMat));
	drawSlopeCubeCorner();
	mvMat = mvMatStack.pop();

	// inverted left slope
	mvMatStack.push(mvMat);
	t = translate(3, 10.5, -1);
	r = rotate(90, 0, 1, 0);
	s = scale4(0.5, 0.5, 0.5);
	mvMat = mult(mvMat, mult(t, mult(rotate(180, 1, 0, 0), mult(r, s))));
	gl.uniformMatrix4fv(mvMatLoc, false, flatten(mvMat));
	drawSlopeCubeMid();
	mvMat = mvMatStack.pop();

	// inverted right slope
	mvMatStack.push(mvMat);
	t = translate(3, 10.5, 1);
	r = rotate(90, 0, 1, 0);
	s = scale4(0.5, 0.5, 0.5);
	mvMat = mult(mvMat, mult(t, mult(rotate(180, 1, 0, 0), mult(r, s))));
	gl.uniformMatrix4fv(mvMatLoc, false, flatten(mvMat));
	drawSlopeCubeMid();
	mvMat = mvMatStack.pop();

	// left high support 
	mvMatStack.push(mvMat);
	t = translate(3, 13, -1);
	s = scale4(0.5, 2, 0.5);
	mvMat = mult(mvMat, mult(t, s));
	gl.uniformMatrix4fv(mvMatLoc, false, flatten(mvMat));
	drawCube();
	mvMat = mvMatStack.pop();

	// right high support
	mvMatStack.push(mvMat);
	t = translate(3, 13, 1);
	s = scale4(0.5, 2, 0.5);
	mvMat = mult(mvMat, mult(t, s));
	gl.uniformMatrix4fv(mvMatLoc, false, flatten(mvMat));
	drawCube();
	mvMat = mvMatStack.pop();

	// mid slope high
	mvMatStack.push(mvMat);
	t = translate(2.5, 13.5, 0);
	r = rotate(-90, 1, 0, 0);
	s = scale4(0.5, 1, 0.5);
	mvMat = mult(mvMat, mult(t, mult(rotate(90, 0, 1, 0), mult(r, s))));
	gl.uniformMatrix4fv(mvMatLoc, false, flatten(mvMat));
	drawSlopeCubeMid();
	mvMat = mvMatStack.pop();

	// left slope high
	mvMatStack.push(mvMat);
	t = translate(1.5, 14.5, -1);
	r = rotate(-90, 1, 0, 0);
	s = scale4(0.5, 1, 0.5);
	mvMat = mult(mvMat, mult(t, mult(rotate(90, 0, 1, 0), mult(r, s))));
	gl.uniformMatrix4fv(mvMatLoc, false, flatten(mvMat));
	drawSlopeCubeMid();
	mvMat = mvMatStack.pop();

	// right slope high
	mvMatStack.push(mvMat);
	t = translate(1.5, 14.5, 1);
	r = rotate(-90, 1, 0, 0);
	s = scale4(0.5, 1, 0.5);
	mvMat = mult(mvMat, mult(t, mult(rotate(90, 0, 1, 0), mult(r, s))));
	gl.uniformMatrix4fv(mvMatLoc, false, flatten(mvMat));
	drawSlopeCubeMid();
	mvMat = mvMatStack.pop();

	/*
	 *	DRAWING ARM TO CENTER
	 */ 

	// mid arm
	mvMatStack.push(mvMat);
	t = translate(0, 15.5, 0);
	r = rotate(-90, 0, 1, 0);
	s = scale4(0.5, 1.5, 1.5);
	mvMat = mult(mvMat, mult(t, mult(rotate(-90, 0, 0, 1), mult(r, s))));
	gl.uniformMatrix4fv(mvMatLoc, false, flatten(mvMat));
	drawSkewCube();
	mvMat = mvMatStack.pop();

	// mid arm 2 
	mvMatStack.push(mvMat);
	t = translate(-6, 18.5, 0);
	r = rotate(-90, 0, 1, 0);
	s = scale4(0.5, 1.5, 1.5);
	mvMat = mult(mvMat, mult(t, mult(rotate(-90, 0, 0, 1), mult(r, s))));
	gl.uniformMatrix4fv(mvMatLoc, false, flatten(mvMat));
	drawSkewCube();
	mvMat = mvMatStack.pop();

	// left arm
	mvMatStack.push(mvMat);
	t = translate(-1, 16.5, -1);
	r = rotate(-90, 0, 1, 0);
	s = scale4(0.5, 1.5, 1.5);
	mvMat = mult(mvMat, mult(t, mult(rotate(-90, 0, 0, 1), mult(r, s))));
	gl.uniformMatrix4fv(mvMatLoc, false, flatten(mvMat));
	drawSkewCube();
	mvMat = mvMatStack.pop();

	// left arm 2
	mvMatStack.push(mvMat);
	t = translate(-7, 19.5, -1);
	r = rotate(-90, 0, 1, 0);
	s = scale4(0.5, 1.5, 1.5);
	mvMat = mult(mvMat, mult(t, mult(rotate(-90, 0, 0, 1), mult(r, s))));
	gl.uniformMatrix4fv(mvMatLoc, false, flatten(mvMat));
	drawSkewCube();
	mvMat = mvMatStack.pop();

	// right arm
	mvMatStack.push(mvMat);
	t = translate(-1, 16.5, 1);
	r = rotate(-90, 0, 1, 0);
	s = scale4(0.5, 1.5, 1.5);
	mvMat = mult(mvMat, mult(t, mult(rotate(-90, 0, 0, 1), mult(r, s))));
	gl.uniformMatrix4fv(mvMatLoc, false, flatten(mvMat));
	drawSkewCube();
	mvMat = mvMatStack.pop();

	// right arm 2
	mvMatStack.push(mvMat);
	t = translate(-7, 19.5, 1);
	r = rotate(-90, 0, 1, 0);
	s = scale4(0.5, 1.5, 1.5);
	mvMat = mult(mvMat, mult(t, mult(rotate(-90, 0, 0, 1), mult(r, s))));
	gl.uniformMatrix4fv(mvMatLoc, false, flatten(mvMat));
	drawSkewCube();
	mvMat = mvMatStack.pop();

	// mid slope higher
	mvMatStack.push(mvMat);
	t = translate(-8, 20.5, 0);
	r = rotate(90, 1, 0, 0);
	s = scale4(0.5, 0.5, 0.5);
	mvMat = mult(mvMat, mult(t, mult(rotate(90, 0, 1, 0), mult(r, s))));
	gl.uniformMatrix4fv(mvMatLoc, false, flatten(mvMat));
	drawSlopeCubeMid();
	mvMat = mvMatStack.pop();
	
	// left slope higher
	mvMatStack.push(mvMat);
	t = translate(-8, 21.5, -1);
	r = rotate(90, 1, 0, 0);
	s = scale4(0.5, 0.5, 0.5);
	mvMat = mult(mvMat, mult(t, mult(rotate(90, 0, 1, 0), mult(r, s))));
	gl.uniformMatrix4fv(mvMatLoc, false, flatten(mvMat));
	drawSlopeCubeMid();
	mvMat = mvMatStack.pop();

	// right slope higher
	mvMatStack.push(mvMat);
	t = translate(-8, 21.5, 1);
	r = rotate(90, 1, 0, 0);
	s = scale4(0.5, 0.5, 0.5);
	mvMat = mult(mvMat, mult(t, mult(rotate(90, 0, 1, 0), mult(r, s))));
	gl.uniformMatrix4fv(mvMatLoc, false, flatten(mvMat));
	drawSlopeCubeMid();
	mvMat = mvMatStack.pop();

	/*
	 * DRAWING ORNAMENTATION
	 */
	lightPosition = vec4(0, 0, -1, 1);
	materialSpecular = vec4(0.5, 0.5, 0.5, 1);
	materialShininess = 7;
	setupLightingMaterial();

	// small ladder-like bars on very top for detail
	for (let i = 0; i < 2; i++)
	{
		for (let j = 0; j < 5; j++)
		{
			mvMatStack.push(mvMat);
			t = translate(-7.2 + i * 6 + j / 2.1, 20.5 - i * 3, 0);
			s = scale4(0.05, 0.05, 0.5);
			mvMat = mult(mvMat, mult(t, s));
			gl.uniformMatrix4fv(mvMatLoc, false, flatten(mvMat));
			drawCube();
			mvMat = mvMatStack.pop();
		}
	}

	// hydraulic pistons (won't be animated)
	// mid 
	mvMatStack.push(mvMat);
	t = translate(3.5, 7.5, 0);
	s = scale4(0.05, 6, 0.05);
	mvMat = mult(mvMat, mult(t, s));
	gl.uniformMatrix4fv(mvMatLoc, false, flatten(mvMat));
	drawCube();
	mvMat = mvMatStack.pop();

	// left 
	mvMatStack.push(mvMat);
	t = translate(3, 7, -1);
	s = scale4(0.05, 4, 0.05);
	mvMat = mult(mvMat, mult(t, s));
	gl.uniformMatrix4fv(mvMatLoc, false, flatten(mvMat));
	drawCube();
	mvMat = mvMatStack.pop();

	// right
	mvMatStack.push(mvMat);
	t = translate(3, 7, 1);
	s = scale4(0.05, 4, 0.05);
	mvMat = mult(mvMat, mult(t, s));
	gl.uniformMatrix4fv(mvMatLoc, false, flatten(mvMat));
	drawCube();
	mvMat = mvMatStack.pop();
}	

function generateShapes()
{
	holodeckBase();
	cube();
	skewCube();
	slopeCubeCorner();
	slopeCubeMid();
	hexagonalPrism();
	sphere();
	laserBeam();
	cryo();
	room_halfCylinder_window();
	room_halfCylinder();
	path();
	extrudedStar();
	alienAntenna();
	skybox_wall();
	floor();
}

function drawPath()
{
	let sceneryItem = getSceneryItem("path");
	drawFaces(sceneryItem.get("start"), sceneryItem.get("end"));
}

function drawHolodeckBase()
{
	let sceneryItem = getSceneryItem("holodeckBase");
	drawFaces(sceneryItem.get("start"), sceneryItem.get("end"));
}

function drawLaserBeam()
{
	let sceneryItem = getSceneryItem("laserBeam");
	drawFaces(sceneryItem.get("start"), sceneryItem.get("end"));
}

function drawCube()
{
	let sceneryItem = getSceneryItem("cube");
	drawFaces(sceneryItem.get("start"), sceneryItem.get("end"));
}

function drawFloor()
{
	let sceneryItem = getSceneryItem("floor");
	drawFaces(sceneryItem.get("start"), sceneryItem.get("end"));
}

// for compatibility with Isaac's shapes
function drawCube_compat(x)
{
	let sceneryItem = getSceneryItem("cube");

	mvMatStack.push(mvMat);
	mvMat = mult(mvMat, scale4(x, x, x));
	gl.uniformMatrix4fv(mvMatLoc, false, flatten(mvMat));
	drawFaces(sceneryItem.get("start"), sceneryItem.get("end"));
	mvMat = mvMatStack.pop();
}

function drawSkewCube()
{
	let sceneryItem = getSceneryItem("skewCube");
	drawFaces(sceneryItem.get("start"), sceneryItem.get("end"));
}

function drawSlopeCubeCorner()
{
	let sceneryItem = getSceneryItem("slopeCubeCorner");
	drawFaces(sceneryItem.get("start"), sceneryItem.get("end"));
}

function drawSlopeCubeMid()
{
	let sceneryItem = getSceneryItem("slopeCubeMid");
	drawFaces(sceneryItem.get("start"), sceneryItem.get("end"));
}	

function drawHexagonalPrism()
{
	let sceneryItem = getSceneryItem("hexagonalPrism");
	drawFaces(sceneryItem.get("start"), sceneryItem.get("end"));
}

function drawSphere()
{
	let sceneryItem = getSceneryItem("sphere");
	drawFaces(sceneryItem.get("start"), sceneryItem.get("end"));
}

// for compatibility with Isaac's shapes
function drawSphere_compat(x)
{
	let sceneryItem = getSceneryItem("sphere");

	mvMatStack.push(mvMat);
	mvMat = mult(mvMat, scale4(x, x, x));
	gl.uniformMatrix4fv(mvMatLoc, false, flatten(mvMat));
	drawFaces(sceneryItem.get("start"), sceneryItem.get("end"));
	mvMat = mvMatStack.pop();
}

function drawCryo()
{
	let sceneryItem = getSceneryItem("cryo");
	drawFaces(sceneryItem.get("start"), sceneryItem.get("end"));
}

function drawRoom_halfCylinder()
{
	let sceneryItem = getSceneryItem("room_halfCylinder");
	drawFaces(sceneryItem.get("start"), sceneryItem.get("end"));
}

function drawRoom_halfCylinder_window()
{
	let sceneryItem = getSceneryItem("room_halfCylinder_window");
	drawFaces(sceneryItem.get("start"), sceneryItem.get("end"));
}

function drawExtrudedStar()
{
	let sceneryItem = getSceneryItem("extrudedStar");
	drawFaces(sceneryItem.get("start"), sceneryItem.get("end"));
}

function drawAlienAntenna()
{
	let sceneryItem = getSceneryItem("antenna");
	drawFaces(sceneryItem.get("start"), sceneryItem.get("end"));
}

function drawSkybox_Wall()
{
	let sceneryItem = getSceneryItem("skybox_wall");
	drawFaces(sceneryItem.get("start"), sceneryItem.get("end"));
}

function drawFaces(start, end)
{
	// calculate normals
	for (let i = start; i < end; i++)
		gl.drawArrays(faces[i][0], faces[i][1], faces[i][2]);
}

function getSceneryItem(name)
{
	for (let i = 0; i < scenery.length; i++)
		if (scenery[i].get("name") === name)
			return scenery[i];

	return null;
}

// mult 4x4 mat by vec4
function multiply(m, v)
{
    var vv=vec4(
     m[0][0]*v[0] + m[0][1]*v[1] + m[0][2]*v[2]+ m[0][3]*v[3],
     m[1][0]*v[0] + m[1][1]*v[1] + m[1][2]*v[2]+ m[1][3]*v[3],
     m[2][0]*v[0] + m[2][1]*v[1] + m[2][2]*v[2]+ m[2][3]*v[3],
     m[3][0]*v[0] + m[3][1]*v[1] + m[3][2]*v[2]+ m[3][3]*v[3]);
    return vv;
}

// return the normal to a vector of vertices
function Newell(vertices)
{
	let x = 0, y = 0, z = 0;

	for (let i = 0; i < vertices.length; i++)
	{
		let nextIndex = (i + 1) % vertices.length;

		x +=	(vertices[i][1] - vertices[nextIndex][1]) *
				(vertices[i][2] + vertices[nextIndex][2]);

		y +=	(vertices[i][2] - vertices[nextIndex][2]) *
				(vertices[i][0] + vertices[nextIndex][0]);

		z +=	(vertices[i][0] - vertices[nextIndex][0]) *
				(vertices[i][1] + vertices[nextIndex][1]);
	}

	return normalize(vec3(x, y, z));
}

// a, b, c are vec4's
function triangle(a, b, c, sStart = 0, tStart = 0, sEnd = 1, tEnd = 1)
{
	let n = Newell([a, b, c]);
	let nv = [n[0], n[1], n[2], 1];
	points.push(a); normals.push(nv); texCoords.push(vec2(sStart, tStart));
	points.push(b); normals.push(nv); texCoords.push(vec2(sEnd, tStart));
	points.push(c); normals.push(nv); texCoords.push(vec2(sEnd, tEnd));

	faces.push([gl.TRIANGLES, points.length - 3, 3]);
}

function alt_triangle(a, b, c, ta, tb, tc)
{
	let n = Newell([a, b, c]);
	let nv = [n[0], n[1], n[2], 1];
	points.push(a); normals.push(nv); texCoords.push(ta);
	points.push(b); normals.push(nv); texCoords.push(tb);
	points.push(c); normals.push(nv); texCoords.push(tc);

	faces.push([gl.TRIANGLES, points.length - 3, 3]);
}

// a, b, c, d are vec4's
function quad(a, b, c, d, tStart = 0, sStart = 0, tEnd = 1, sEnd = 1)
{
	let n = Newell([a, b, c]); 
	let nv = [n[0], n[1], n[1], 1];
	
	// a, b, c
	points.push(a); normals.push(nv); texCoords.push(vec2(sStart, tStart));
	points.push(b); normals.push(nv); texCoords.push(vec2(sEnd, tStart));
	points.push(c); normals.push(nv); texCoords.push(vec2(sEnd, tEnd));
	faces.push([gl.TRIANGLES, points.length - 3, 3]);

	// a, c, d
	points.push(a); normals.push(nv); texCoords.push(vec2(sStart, tStart));
	points.push(c); normals.push(nv); texCoords.push(vec2(sEnd, tEnd));
	points.push(d); normals.push(nv); texCoords.push(vec2(sStart, tEnd));
	faces.push([gl.TRIANGLES, points.length - 3, 3]);
}

function pentagon(a, b, c, d, e)
{
	triangle(a, b, c);
	triangle(a, c, d);
	triangle(a, d, e);
}

/*
 * WRITTEN BY ISAAC
 *
 * modified by Ryan so that it works in this implementation
 */
function hexagon(a, b, c, d, e, f)
{
	triangle(a, b, c);
	triangle(a, c, d);
	triangle(a, d, e);
	triangle(a, e, f);
}

function skybox_wall()
{
	let sceneryItem = new Map();
	sceneryItem.set("name", "skybox_wall");
	sceneryItem.set("start", faces.length);

	quad(vec4(-1, -1, 0, 1), vec4(1, -1, 0, 1), vec4(1, 1, 0, 1), vec4(-1, 1, 0, 1));

	sceneryItem.set("end", faces.length);
	scenery.push(sceneryItem);
}

function path()
{
	let sceneryItem = new Map();
	sceneryItem.set("name", "path");
	sceneryItem.set("start", faces.length);

	quad(vec4(1, 0, -1, 1), vec4(-1, 0, -1, 1), vec4(-1, 0, 1, 1), vec4(1, 0, 1, 1));

	sceneryItem.set("end", faces.length);
	scenery.push(sceneryItem);
}

function floor()
{
	let sceneryItem = new Map();
	sceneryItem.set("name", "floor");
	sceneryItem.set("start", faces.length);

	let nSlices = 40;
	let slices = [vec4(1, 0, 0, 1)];
	let texSlices = [vec2(0.5, 0)];
	let r = rotate(360 / nSlices, 0, 1, 0);
	let tex_r = rotate(360 / nSlices, 0, 0, 1);
	for (let i = 0; i < nSlices; i++)
	{
		slices.push(multiply(r, slices[i]));
		let texSlice = multiply(tex_r, vec4(texSlices[i][0], texSlices[i][1], 0, 1));
		texSlices.push(vec2(texSlice[0], texSlice[1]));
	}

	for (let i = 0; i < nSlices; i++)
	{
		let tA = vec2(texSlices[i][0] + 0.5, texSlices[i][1] + 0.5);
		let tB = vec2(texSlices[i + 1][0] + 0.5, texSlices[i + 1][1] + 0.5);
		let tC = vec2(0.5, 0.5);

		alt_triangle(slices[i], slices[i + 1], vec4(0, 0, 0, 1), tA, tB, tC);
	}

	sceneryItem.set("end", faces.length);
	scenery.push(sceneryItem);
}

function cube()
{
	let sceneryItem = new Map();
	sceneryItem.set("name", "cube");
	sceneryItem.set("start", faces.length);

	quad(vec4(1, 1, 1, 1), vec4(-1, 1, 1, 1), vec4(-1, -1, 1, 1), vec4(1, -1, 1, 1)); 		// front face
	quad(vec4(1, -1, -1, 1), vec4(-1, -1, -1, 1), vec4(-1, 1, -1, 1), vec4(1, 1, -1, 1));		// back face
	quad(vec4(1, 1, 1, 1), vec4(-1, 1, 1, 1), vec4(-1, 1, -1, 1), vec4(1, 1,  -1, 1));		// top face
	quad(vec4(1, -1, 1, 1), vec4(-1, -1, 1, 1), vec4(-1, -1, -1, 1), vec4(1, -1,  -1, 1));	// bottom face
	quad(vec4(-1, 1, 1, 1), vec4(-1, 1, -1, 1), vec4(-1, -1, -1, 1), vec4(-1, -1, 1, 1));		// left face
	quad(vec4(1, 1, 1, 1), vec4(1, 1, -1, 1), vec4(1, -1, -1, 1), vec4(1, -1, 1, 1));			// right face

	sceneryItem.set("end", faces.length);
	scenery.push(sceneryItem);
}

function skewCube()
{
	let sceneryItem = new Map();
	sceneryItem.set("name", "skewCube");
	sceneryItem.set("start", faces.length);

	quad(vec4(1, 1, 1, 1), vec4(-1, 1, 1, 1), vec4(-1, -1, 1, 1), vec4(1, -1, 1, 1)); 		// front face
	quad(vec4(1, 1, -1, 1), vec4(-1, 1, -1, 1), vec4(-1, 3, -1, 1), vec4(1, 3, -1, 1));		// back face
	quad(vec4(1, 1, 1, 1), vec4(-1, 1, 1, 1), vec4(-1, 3, -1, 1), vec4(1, 3, -1, 1));		// top face
	quad(vec4(1, -1, 1, 1), vec4(-1, -1, 1, 1), vec4(-1, 1, -1, 1), vec4(1, 1, -1, 1));	// bottom face
	quad(vec4(-1, 1, 1, 1), vec4(-1, 3, -1, 1), vec4(-1, 1, -1, 1), vec4(-1, -1, 1, 1));		// left face
	quad(vec4(1, 1, 1, 1), vec4(1, 3, -1, 1), vec4(1, 1, -1, 1), vec4(1, -1, 1, 1));			// right face

	sceneryItem.set("end", faces.length);
	scenery.push(sceneryItem);
}

function slopeCubeCorner()
{
	let sceneryItem = new Map();
	sceneryItem.set("name", "slopeCubeCorner");
	sceneryItem.set("start", faces.length);

	triangle(vec4(1, 1, 1, 1), vec4(-1, -1, 1, 1), vec4(1, -1, 1, 1));	// front face
	triangle(vec4(1, 1, 1, 1), vec4(1, -1, -1, 1), vec4(1, -1, 1, 1));	// right face
	triangle(vec4(-1, -1, 1, 1), vec4(1, -1, -1, 1), vec4(1, 1, 1, 1));	// hypotenuse
	triangle(vec4(-1, -1, 1, 1), vec4(1, -1, -1, 1), vec4(1, -1, 1, 1));	// bottom face

	sceneryItem.set("end", faces.length);
	scenery.push(sceneryItem);
}

function slopeCubeMid()
{
	let sceneryItem = new Map();
	sceneryItem.set("name", "slopeCubeMid");
	sceneryItem.set("start", faces.length);

	quad(vec4(1, 1, 1, 1), vec4(-1, 1, 1, 1), vec4(-1, -1, 1, 1), vec4(1, -1, 1, 1)); 		// front face
	quad(vec4(1, -1, 1, 1), vec4(-1, -1, 1, 1), vec4(-1, -1, -1, 1), vec4(1, -1,  -1, 1));	// bottom face
	triangle(vec4(1, 1, 1, 1), vec4(1, -1, -1, 1), vec4(1, -1, 1, 1));						// right face
	triangle(vec4(-1, 1, 1, 1), vec4(-1, -1, -1, 1), vec4(-1, -1, 1, 1));						// left face
	quad(vec4(1, 1, 1, 1), vec4(1, -1, -1, 1), vec4(-1, -1, -1, 1), vec4(-1, 1, 1, 1));		// slope face

	sceneryItem.set("end", faces.length);
	scenery.push(sceneryItem);
}

function sphere()
{
	let sceneryItem = new Map();
	sceneryItem.set("name", "sphere");
	sceneryItem.set("start", faces.length);

	let nSlices = 36;
	let nStacks = 36;

	// generate points on sphere
	// stacks generate from top to bottom
	let stacks = [];
	let texStacks = [];
	for (let i = 0; i <= nStacks; i++)
	{
		let V = i / nStacks;
		let phi = V * Math.PI;

		let slices = [];
		let texSlices = [];
		for (let j = 0; j <= nSlices; j++)
		{
			// middle sections of sphere
			let U = j / nSlices;
			let theta = U * Math.PI * 2;

			// calculate positions
			let x = Math.cos(theta) * Math.sin(phi);
			let y = Math.cos(phi);
			let z = Math.sin(theta) * Math.sin(phi);
			slices.push(vec4(x, y, z, 1));

			// texture coordinates
			let tTheta = Math.atan2(-z, x);
			let t = (tTheta + Math.PI) / (2 * Math.PI);
			let sPhi = Math.acos(-y);
			let s = sPhi / Math.PI;
			texSlices.push(vec2(s, t));
		}

		stacks.push(slices);
		texStacks.push(texSlices);
	}

	// create mesh
	// generating from bottom to top
	for (let stack = 0; stack < nStacks; stack++)
	{
		for (let slice = 0; slice < nSlices; slice++)
		{
			let a = stacks[stack][slice];
			let b = stacks[stack][slice + 1];
			let c = stacks[stack + 1][slice + 1];
			let d = stacks[stack + 1][slice];

			let texStart = texStacks[stack][slice];
			let texEnd = texStacks[stack + 1][slice + 1];

			// error correction for texture coords
			if (slice == nSlices / 2)
			{
				texStart[1] = 1;
				texEnd[1] = 0.95;
			}
			
			quad(a, b, c, d, texStart[0], texStart[1], texEnd[0], texEnd[1]);
		}
	}

	sceneryItem.set("end", faces.length);
	scenery.push(sceneryItem);
}

/*
 *	WRITTEN BY ISAAC
 */
function alienAntenna() {

    let sceneryItem = new Map();
    sceneryItem.set("name", "antenna");
    sceneryItem.set("start", faces.length);

    var t = [
        vec4(0, 0, 0, 1),
        vec4(0, .2, 0, 1),
        vec4(.01, .24, 0, 1),
        vec4(.03, .27, 0, 1),
        vec4(.05, .28, 0, 1),
        vec4(.07, .28, 0, 1),
        vec4(.05, .3, 0, 1),
        vec4(.05, .33, 0, 1),
        vec4(.01, .37, 0, 1),
        vec4(.009, .37, 0, 1),
        vec4(.009, .43, 0, 1),
        vec4(.01, .44, 0, 1),
        vec4(.02, .45, 0, 1),
        vec4(.03, .46, 0, 1),
        vec4(.04, .47, 0, 1),
        vec4(.05, .48, 0, 1),
        vec4(.04, .49, 0, 1),
        vec4(.03, .5, 0, 1),
        vec4(.02, .51, 0, 1),
        vec4(.01, .52, 0, 1),
        vec4(.009, .53, 0, 1),
        vec4(.009, .7, 0, 1),
        vec4(.01, .71, 0, 1),
        vec4(.03, .75, 0, 1),
        vec4(.05, .78, 0, 1),
        vec4(.07, .80, 0, 1),
        vec4(.09, .82, 0, 1),
        vec4(.11, .83, 0, 1),
        vec4(.13, .84, 0, 1),
        vec4(.15, .86, 0, 1),
        vec4(.13, .88, 0, 1),
        vec4(.11, .89, 0, 1),
        vec4(.09, .90, 0, 1),
        vec4(.07, .92, 0, 1),
        vec4(.05, .94, 0, 1),
        vec4(.03, .96, 0, 1),
        vec4(.009, .97, 0, 1)
        //vec4(.009, .97, 0, 1)
    ];

    var v = [];
    var a = Math.PI / 12;
    var r;
    var x;
    for (var i = 0; i < 24; i++) {
        var angle = (i + 1) * a;
        for (var j = 0; j < 36; j++) {
            r = t[j][0];
          
            v.push(vec4(r * Math.cos(angle), t[j][1], -r * Math.sin(angle), 1));
        }
    }
    
    var N = 36;
    var v1, v2, v3, v4;
    for (var i = 0; i < 23; i++) {
        for (var j = 0; j < 24; j++) {
            v1 = i * N + j;
            v2 = (i + 1) * N + j;
            v3 = (i + 1) * N + (j + 1);
            v4 = i * N + (j + 1);
            
            quad(v[v1], v[v2], v[v3], v[v4]);
        }
    }

    sceneryItem.set("end", faces.length);
    scenery.push(sceneryItem);
}

function hexagonalPrism()
{
	let sceneryItem = new Map();
	sceneryItem.set("name", "hexagonalPrism");
	sceneryItem.set("start", faces.length);

	let slices = [vec4(1, 0, 0, 1)];

	// base and top
	let r = rotate(60, 0, 1, 0);
	for (let i = 0; i < 6; i++)
	{

		slices.push(multiply(r, slices[i]));
		let t1 = vec4(slices[i][0], 1, slices[i][2], 1);
		let t2 = vec4(slices[i + 1][0], 1, slices[i + 1][2], 1);

		triangle(slices[i], slices[i + 1], vec4(0, 0, 0, 1));
		triangle(t1, t2, vec4(0, 1, 0, 1));
	}

	// sides
	for (let i = 0; i < 6; i++)
	{
		let t1 = vec4(slices[i][0], 1, slices[i][2], 1);
		let t2 = vec4(slices[i + 1][0], 1, slices[i + 1][2], 1);
		quad(slices[i], slices[i + 1], t2, t1); 
	}

	sceneryItem.set("end", faces.length);
	scenery.push(sceneryItem);
}

// extruded 5pointed star
function extrudedStar()
{
	let sceneryItem = new Map();
	sceneryItem.set("name", "extrudedStar");
	sceneryItem.set("start", faces.length);

	// pentagon points
	let pPoints = [];
	pPoints.push(vec4(1, 0, 1, 1));
	pPoints.push(vec4(-1, 0, 1, 1));
	pPoints.push(vec4(-2, 0, -1, 1));
	pPoints.push(vec4(0, 0, -2, 1));
	pPoints.push(vec4(2, 0, -1, 1));

	// make base
	pentagon(pPoints[0], pPoints[1], pPoints[2], pPoints[3], pPoints[4]);

	// make sides
	for (let i = 1; i < pPoints.length; i++)
		quad(pPoints[i], vec4(pPoints[i][0], 1, pPoints[i][2], 1), vec4(pPoints[i - 1][0], 1, pPoints[i - 1][2], 1), pPoints[i - 1]);
	// get last face
	quad(pPoints[0], vec4(pPoints[0][0], 1, pPoints[0][2], 1), vec4(pPoints[4][0], 1, pPoints[4][2], 1), pPoints[4]);

	// make top
	pentagon
	(
		vec4(pPoints[0][0], 1, pPoints[0][2], 1),
		vec4(pPoints[1][0], 1, pPoints[1][2], 1),
		vec4(pPoints[2][0], 1, pPoints[2][2], 1),
		vec4(pPoints[3][0], 1, pPoints[3][2], 1),
		vec4(pPoints[4][0], 1, pPoints[4][2], 1)
	);

	// make triangles
	let tPoints = [];
	tPoints.push([vec4(2, 0, -1, 1), vec4(4, 0, 1, 1), vec4(1, 0, 1, 1)]);
	tPoints.push([vec4(1, 0, 1, 1), vec4(0, 0, 3, 1), vec4(-1, 0, 1, 1)]);
	tPoints.push([vec4(-1, 0, 1, 1), vec4(-4, 0, 1, 1), vec4(-2, 0, -1, 1)]);
	tPoints.push([vec4(-2, 0, -1, 1), vec4(-3, 0, -3, 1), vec4(0, 0, -2, 1)]);
	tPoints.push([vec4(0, 0, -2, 1), vec4(3, 0, -3, 1), vec4(2, 0, -1, 1)]);

	// for each triangle, make walls
	for (let i = 0; i < tPoints.length; i++)
		for (let j = 0; j < tPoints[i].length - 1; j++)
			quad(tPoints[i][j], vec4(tPoints[i][j][0], 1, tPoints[i][j][2], 1), vec4(tPoints[i][j + 1][0], 1, tPoints[i][j + 1][2], 1), tPoints[i][j + 1]);

	// bottom and top faces of extruded triangles
	tPoints.forEach
	(
		function(tp) 
		{
			triangle(tp[0], tp[1], tp[2]);
			triangle(vec4(tp[0][0], 1, tp[0][2], 1), vec4(tp[1][0], 1, tp[1][2], 1), vec4(tp[2][0], 1, tp[2][2], 1));
		}
	);

	sceneryItem.set("end", faces.length);
	scenery.push(sceneryItem);
}

// bunch of lines just to make the hologram effect a little cooler
function laserBeam()
{
	let sceneryItem = new Map();
	sceneryItem.set("name", "laserBeam");
	sceneryItem.set("start", faces.length);

	let nPlanes = 3;
	let planeStart = vec4(1, 0, 0, 1);
	for (let i = 0; i < nPlanes; i++)
	{
		let planeEnd = multiply(rotate(180, 0, 1, 0), planeStart);

		let v3 = vec4(planeEnd[0], 1, planeEnd[2], 1);
		let v4 = vec4(planeStart[0], 1, planeStart[2], 1);

		quad(planeStart, planeEnd, v3, v4);

		planeStart = multiply(rotate(360 / nPlanes, 0, 1, 0), planeStart);
	}

	sceneryItem.set("end", faces.length);
	scenery.push(sceneryItem);
}

// generate a mesh of the holodeck base
function holodeckBase() 
{
	// set up map that will contain information about faces in the mesh
	let sceneryItem = new Map();
	sceneryItem.set("name", "holodeckBase");
	sceneryItem.set("start", faces.length);

	let nSlices = 24; 	// certain values of this parameter will produce wonky results and I'm not sure why 
	let height = 2;		// height of the structure
	let length = 2;		// length of the structure
	let radius = 7;
	let slices = [[vec4(length, 0, 0, 1), vec4(0, height, 0, 1)]];
	let t = translate(radius, 0, 0);	// push each line along the x axis by 3 units before rotating
	slices[0][0] = multiply(t, slices[0][0]);
	slices[0][1] = multiply(t, slices[0][1]);
	let r = rotate(360 / nSlices, 0, 1, 0); // rotate about y axis

	let stairPercent = 1;

	// leave room for a staircase, so we want to remove 20% of the lines (hence nSlice - nSlices * .2)
	for (let i = 0; i < nSlices - (nSlices * stairPercent); i++)
	{
		slices.push([]);
		for (let pointIndex = 0; pointIndex < slices[i].length; pointIndex++)
			slices[i + 1].push(multiply(r, slices[i][pointIndex]));

		quad(slices[i][1], slices[i][0], slices[i + 1][0], slices[i + 1][1]);
		triangle(slices[i][1], vec4(0, height, 0, 1), slices[i + 1][1]);		// top surface
	}

	// add walls to the parts of the disk that aren't connected
	// to form a right triangle, z coord will be:
	// 		x coord of second point, y coord of first point, z coord of second point
	if (stairPercent < 1 && stairPercent > 0)
	{
		triangle(slices[0][0], slices[0][1], vec4(slices[0][1][0], slices[0][0][1], slices[0][1][2]));

		let last = slices.length - 1;
		triangle(slices[last][0], slices[last][1], vec4(slices[last][1][0], slices[last][0][1], slices[last][1][2]));
	}

	// start stairs
	let nStairSlices = nSlices * stairPercent;
	let stairInterpPoints = [[slices[slices.length - 1][0], slices[slices.length - 1][1]]]; // start and end points for interpolation
	let stairSlices = [];
	let nSteps = 5;
	rot = rotate((360 * stairPercent) / nStairSlices, 0, 1, 0);

	// create point definitions for full staircase by interpolation points around the y axis
	for (let stairSlice = 0; stairSlice <= nStairSlices; stairSlice++)
	{
		// create a slice of a staircase by linearly interpolating between a start and end point
		stairSlices.push([]);
		for (let i = 0; i < nSteps; i++)
		{
			// height of step determined by number of steps
			// width of step determined by number of stair slices
			let x = (1 - i / nSteps) * stairInterpPoints[stairSlice][0][0] + (i / nSteps) * stairInterpPoints[stairSlice][1][0];
			let y = (1 - i / nSteps) * stairInterpPoints[stairSlice][0][1] + (i / nSteps) * stairInterpPoints[stairSlice][1][1];
			let z = (1 - i / nSteps) * stairInterpPoints[stairSlice][0][2] + (i / nSteps) * stairInterpPoints[stairSlice][1][2];
			let nextX = (1 - (i + 1) / nSteps) * stairInterpPoints[stairSlice][0][0] + ((i + 1) / nSteps) * stairInterpPoints[stairSlice][1][0];
			let nextY = (1 - (i + 1) / nSteps) * stairInterpPoints[stairSlice][0][1] + ((i + 1) / nSteps) * stairInterpPoints[stairSlice][1][1];
			let nextZ = (1 - (i + 1) / nSteps) * stairInterpPoints[stairSlice][0][2] + ((i + 1) / nSteps) * stairInterpPoints[stairSlice][1][2];
			//console.log("x: " + x + "; y: " + y + "; z: " + z + "\nnext x: " + nextX + "; next y: " + nextY + "; next z: " + nextZ);
		
			// i forgot what's going on here
			stairSlices[stairSlice].push([vec4(x, y, z, 1), vec4(nextX, y, nextZ, 1), vec4(nextX, y, nextZ, 1), vec4(nextX, nextY, nextZ, 1)]);
		}

		// rotate around y axis by (360 * stairPercent) / nStairSlices amount
		// set up new start and end points for the linear interpolation
		stairInterpPoints.push([multiply(rot, stairInterpPoints[stairSlice][0]), multiply(rot, stairInterpPoints[stairSlice][1])]);
	}

	for (let slice = 0; slice < stairSlices.length - 1; slice++)
	{
		for (let step = 0; step < nSteps; step++)
		{
			quad(stairSlices[slice][step][0], stairSlices[slice + 1][step][0], stairSlices[slice + 1][step][1], stairSlices[slice][step][1]);
			quad(stairSlices[slice][step][2], stairSlices[slice + 1][step][2], stairSlices[slice + 1][step][3], stairSlices[slice][step][3]);

			if (step == nSteps - 1)
				triangle(stairSlices[slice][step][3], vec4(0, height, 0, 1), stairSlices[slice + 1][step][3]);	// topmost surface of object
		}
	}

	// set number of points making up the scenery and set the name
	sceneryItem.set("end", faces.length);
	scenery.push(sceneryItem);
}

/*
 *	WRITTEN BY ISAAC
 *
 *	Ryan: Just modifying so it works with my implementation
 */
function cryo()
{
	let sceneryItem = new Map();
	sceneryItem.set("name", "cryo");
	sceneryItem.set("start", faces.length);

	var v = [

			// cube - UNUSED but necessary so I don't have to change the vertex indices below this array
			vec4(-0.5, -0.5, 0.5, 1.0),
			vec4(-0.5, 0.5, 0.5, 1.0),
			vec4(0.5, 0.5, 0.5, 1.0),
			vec4(0.5, -0.5, 0.5, 1.0),
			vec4(-0.5, -0.5, -0.5, 1.0),
			vec4(-0.5, 0.5, -0.5, 1.0),
			vec4(0.5, 0.5, -0.5, 1.0),
			vec4(0.5, -0.5, -0.5, 1.0),

			//for cryo chamber
			vec4(0.0, 0.0, 5.0, 1), //A (8)
			vec4(2.5, 0.0, 5.0, 1), //B (9)
			vec4(2.5, 1.3, 5.0, 1), //C (10)
			vec4(2.0, 1.8, 5.0, 1), //D (11)
			vec4(0.5, 1.8, 5.0, 1), //E (12) 
			vec4(0.0, 1.3, 5.0, 1), //F (13) 

			vec4(0.0, 0.0, 0.0, 1), //G (14)
			vec4(0.0, 1.3, 0.0, 1), //H (15)
			vec4(0.5, 1.8, 0.0, 1), //I (16) 
			vec4(2.0, 1.8, 0.0, 1), //J (17) 
			vec4(2.5, 1.3, 0.0, 1), //K (18) 
			vec4(2.5, 0.0, 0.0, 1),  //L (19)

			vec4(2.2, 1.3, 3.0, 1), //M (20) for triangle
			vec4(2.5, 0.0, 3.0, 1), //N (21)
			vec4(4.0, 0.0, 5.0, 1), //O (22)
			vec4(4.0, 1.3, 5.0, 1), //P (23)

			vec4(0.0, 0.0, 3.0, 1), //Q (24)
			vec4(0.0, 1.3, 3.0, 1), //R (25)
			vec4(-1.5, 1.3, 5.0, 1), //S (26)
			vec4(-1.5, 0.0, 5.0, 1) //T (27)
	];

    quad(v[9], v[19], v[18], v[10]); 	//right
    quad(v[10], v[18], v[17], v[11]);  	//right roof
    quad(v[12], v[11], v[17], v[16]);   //top
    quad(v[13], v[12], v[16], v[15]);   //left roof
    quad(v[8], v[13], v[15], v[14]);   	//left
    quad(v[9], v[8], v[14], v[19]);  	//bottom
    hexagon(v[8], v[9], v[10], v[11], v[12], v[13]); 	 //front
    hexagon(v[14], v[15], v[16], v[17], v[18], v[19]);   //back
    quad(v[9], v[22], v[23], v[10]); 	//bottom right triangle
    quad(v[20], v[23], v[22], v[21]);   //top right triangle
    triangle(v[10], v[23], v[20]);     	//front right triangle
    triangle(v[9], v[21], v[22]);     	//back right triangle

    quad(v[8], v[13], v[26], v[27]); 	//bottom left triangle
    quad(v[27], v[26], v[25], v[24]);   //top left triangle
    triangle(v[13], v[26], v[25]);     	//front left triangle
    triangle(v[8], v[27], v[24]);     	//back left triangle

	sceneryItem.set("end", faces.length);
	scenery.push(sceneryItem);
}

function room_halfCylinder()
{
	let sceneryItem = new Map();
	sceneryItem.set("name", "room_halfCylinder");
	sceneryItem.set("start", faces.length);

	let nSlices = 100;
	let slices = [vec4(1, 0, 0, 1)];
	let r = rotate(180 / nSlices, 0, 1, 0);
	for (let i = 0; i < nSlices; i++)
		slices.push(multiply(r, slices[i]));
	
	for (let i = 0; i < nSlices - 1; i++)
	{
		// texture mapping to quad
		let sStart = i / nSlices;
		let tStart = 0;
		let sEnd = (i + 1) / nSlices;
		let tEnd = 1;

		quad
		(
			slices[i], 
			vec4(slices[i][0], 1, slices[i][2], 1), 
			vec4(slices[i + 1][0], 1, slices[i + 1][2], 1), 
			slices[i + 1],
			sStart, tStart, sEnd, tEnd
		);
	}

	sceneryItem.set("end", faces.length);
	scenery.push(sceneryItem);
}

function room_halfCylinder_window()
{
	let sceneryItem = new Map();
	sceneryItem.set("name", "room_halfCylinder_window");
	sceneryItem.set("start", faces.length);

	let windowPercent_vertical = 0.3;	// for some reason it's actually 1 - x that will be the result
	let windowPercent_horizontal = 0.5;	// Only 0, 0.5, and 1 seem to work

	let nSlices = 100;
	let slices = [vec4(1, 0, 0, 1)];
	let r = rotate(180 / nSlices, 0, 1, 0);
	for (let i = 0; i < nSlices; i++)
		slices.push(multiply(r, slices[i]));

	// generate wall up to the beginning of the window section
	//console.log(nSlices - (nSlices - (nSlices * windowPercent_horizontal / 2)));
	for (let i = 1; i < nSlices - (nSlices - (nSlices * windowPercent_horizontal / 2)) + 1; i++)
	{
		// texture mapping to quad
		let sStart = (i - 1) / (nSlices - (nSlices - (nSlices * windowPercent_horizontal / 2)));
		let tStart = 0;
		let sEnd = i / (nSlices - (nSlices - (nSlices * windowPercent_horizontal / 2)));
		let tEnd = 1;

		quad(slices[i - 1], vec4(slices[i - 1][0], 1, slices[i - 1][2], 1), vec4(slices[i][0], 1, slices[i][2], 1), slices[i], sStart, tStart, sEnd, tEnd);
	}

	// generate window parts
	for (let i = nSlices - (nSlices - (nSlices * windowPercent_horizontal / 2)) + 1; i < nSlices - (nSlices * windowPercent_horizontal / 2); i++)
	{
		// texture mapping to quad
		let sStart = (i - 1) / (nSlices - (nSlices * windowPercent_horizontal / 2)); 
		let tStart = 0;
		let sEnd = i / (nSlices - (nSlices * windowPercent_horizontal / 2));
		let tEnd = windowPercent_vertical / 2;

		quad
		(
			slices[i - 1], 
			vec4(slices[i - 1][0], 1 - (1 - windowPercent_vertical / 2), slices[i - 1][2], 1), 
			vec4(slices[i][0], 1 - (1 - windowPercent_vertical / 2), slices[i][2], 1), 
			slices[i],
			sStart, tStart, sEnd, tEnd
		);

		// texture mapping to quad
		tStart = 1 - windowPercent_vertical / 2;
		tEnd = 1;

		quad
		(
			vec4(slices[i - 1][0], 1 - windowPercent_vertical / 2, slices[i - 1][2], 1),
			vec4(slices[i - 1][0], 1, slices[i - 1][2], 1),
			vec4(slices[i][0], 1, slices[i][2], 1),
			vec4(slices[i][0], 1 - windowPercent_vertical / 2, slices[i][2], 1),
			sStart, tStart, sEnd, tEnd
		);
	}

	// generate wall after window section
	for (let i = nSlices - (nSlices * windowPercent_horizontal / 2); i < nSlices; i++)
	{
		// texture mapping to quad
		let sStart = (i - 1) / nSlices;
		let tStart = 0;
		let sEnd = (i + 1) / nSlices;
		let tEnd = 1;

		quad(slices[i - 1], vec4(slices[i - 1][0], 1, slices[i - 1][2], 1), vec4(slices[i][0], 1, slices[i][2], 1), slices[i], sStart, tStart, sEnd, tEnd);
	}

	sceneryItem.set("end", faces.length);
	scenery.push(sceneryItem);
}

function loadNewTexture(texIndex)
{
	gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);

	gl.activeTexture(gl.TEXTURE0 + texIndex);
	gl.bindTexture(gl.TEXTURE_2D, textures[texIndex]);

	gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, textures[texIndex].image);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
}

function openNewTexture(src)
{
	let texIndex = textures.length;
	
	textures[texIndex] = gl.createTexture();
	textures[texIndex].image = new Image();

	textures[texIndex].image.onload = function()
	{
		loadNewTexture(texIndex);
	}

	textures[texIndex].image.src = src;
}

function setupLightingMaterial()
{
	// set up lighting and material
	ambientProduct = mult(lightAmbient, materialAmbient);
	diffuseProduct = mult(lightDiffuse, materialDiffuse);
	specularProduct = mult(lightSpecular, materialSpecular);

	// send light source position to GPU
	let lPosLoc = gl.getUniformLocation(program, "lightPosition");
	gl.uniform4fv(lPosLoc, flatten(lightPosition));

	// send lighting and material coefficient products to GPU
	let apLoc = gl.getUniformLocation(program, "ambientProduct");
	let dpLoc = gl.getUniformLocation(program, "diffuseProduct");
	let spLoc = gl.getUniformLocation(program, "specularProduct");
	let shLoc = gl.getUniformLocation(program, "shininess");

	gl.uniform4fv(apLoc, flatten(ambientProduct));
	gl.uniform4fv(dpLoc, flatten(diffuseProduct));
	gl.uniform4fv(spLoc, flatten(specularProduct));
	gl.uniform1f(shLoc, materialShininess);
}

function setupWebGL()
{
	console.log("Setting up WebGL...");

	// get canvas element
	let canvas = document.getElementById("gl-canvas");

	// get rendering context for webgl
	gl = WebGLUtils.setupWebGL(canvas);
	if (!gl) {console.log("Failed to get rendering context for WebGL."); return;}
	gl.viewport(0, 0, canvas.width, canvas.height);
	gl.clearColor(0, 0, 0, 1.0);
	gl.enable(gl.DEPTH_TEST);

	// load shaders, init attribute buffers
	program = initShaders(gl, "vertex-shader", "fragment-shader");
	gl.useProgram(program);
	if (!program) {console.log("Failed to initialize shaders."); return;}
	
	// GENERATE POINTS
	generateShapes();
	// END GENERATE POINTS

	/* load data into GPU */
	// textures
	let tBuf = gl.createBuffer();
	gl.bindBuffer(gl.ARRAY_BUFFER, tBuf);
	gl.bufferData(gl.ARRAY_BUFFER, flatten(texCoords), gl.STATIC_DRAW);

	let aTex = gl.getAttribLocation(program, "aTex");
	gl.vertexAttribPointer(aTex, 2, gl.FLOAT, false, 0, 0);
	gl.enableVertexAttribArray(aTex);

	// normals
	let nBuf = gl.createBuffer();
	gl.bindBuffer(gl.ARRAY_BUFFER, nBuf);
	gl.bufferData(gl.ARRAY_BUFFER, flatten(normals), gl.STATIC_DRAW);

	let aNorm = gl.getAttribLocation(program, "aNorm");
	gl.vertexAttribPointer(aNorm, 4, gl.FLOAT, false, 0, 0);
	gl.enableVertexAttribArray(aNorm);

	// points
	let pBuf = gl.createBuffer();
	gl.bindBuffer(gl.ARRAY_BUFFER, pBuf);
	gl.bufferData(gl.ARRAY_BUFFER, flatten(points), gl.STATIC_DRAW);

	let aPos = gl.getAttribLocation(program, "aPos");
	gl.vertexAttribPointer(aPos, 4, gl.FLOAT, false, 0, 0);
	gl.enableVertexAttribArray(aPos);

	// get location of matrices
	mvMatLoc = gl.getUniformLocation(program, "mvMat");
	projMatLoc = gl.getUniformLocation(program, "projMat");

	/*
	 * LOAD TEXTURES
	 */
	//openNewTexture("textures/test.png");
	//openNewTexture("textures/moon_surface.jpg");
	//openNewTexture("textures/planet_surface.png");
	openNewTexture("textures/planet_surface.jpg");		// 0
	openNewTexture("textures/carpet.jpg");				// 1
	openNewTexture("textures/metal_wall.jpg");			// 2
	openNewTexture("textures/metal_holoprojector.jpg");	// 3
	openNewTexture("textures/laser_beam.png");			// 4
	//openNewTexture("textures/test_skybox.jpg");			
	openNewTexture("textures/universe.png");			// 5
	openNewTexture("textures/metal_floor.png");			// 6
	openNewTexture("textures/metal_holodeck.jpg");		// 7
	openNewTexture("textures/metal_cryochamber.jpg");	// 8
	openNewTexture("textures/yellow.jpg");				// 9
	openNewTexture("textures/alien_skin.jpg");			// 10

	/*
	 * LOAD SOUNDS
	 */
	sounds.push(new Audio("sounds/laser.mp3"));			// 0
	sounds.push(new Audio("sounds/machine_start.wav"));	// 1
	sounds.push(new Audio("sounds/cryo_open.wav"));		// 2
	sounds.push(new Audio("sounds/cryo_open_alt.wav"));	// 3
	sounds.push(new Audio("sounds/power_down.mp3"));	// 4

	console.log("Successfully set up WebGL.");
}

function scale4(a, b, c) {
   	let result = mat4();
    result[0][0] = a;
    result[1][1] = b;
    result[2][2] = c;
    return result;
}
