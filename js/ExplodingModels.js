var camera, scene, renderer;

var loadedObject, model, explosionMaterial;
var instances = document.getElementById('instance-slider').value;
var subdivisions = document.getElementById('subdivision-slider').value;
var needsReset = false;
var clock = new THREE.Clock(false);
var start;

/**
 * Initialize variables, load the model geometry, register event listeners, and create initial scene.
 */
function init() {
    var container = document.createElement('div');
    document.body.appendChild(container);

    camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 1, 40);
    camera.position.z = 10;

    scene = new THREE.Scene();

    renderer = new THREE.WebGLRenderer();
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight);
    container.appendChild(renderer.domElement);

    var manager = new THREE.LoadingManager();
    manager.onProgress = function (item, loaded, total) {
        console.log(item, loaded, total);
    };

    var onProgress = function (xhr) {
        if (xhr.lengthComputable) {
            var percentComplete = xhr.loaded / xhr.total * 100;
            console.log(Math.round(percentComplete, 2) + '% downloaded');
        }
    };

    var onError = function (xhr) { };

    var loader = new THREE.OBJLoader(manager);
    loader.load('./resources/wt_teapot.obj', function (object) {
        loadedObject = object;
        createScene();
    }, onProgress, onError);

    var customObjFile = document.getElementById('custom-obj-file');
    customObjFile.addEventListener('change', function () {
        if (this.files[0]) {
            var filename = URL.createObjectURL(this.files[0]);
            loader.load(filename, function (object) {
                loadedObject = object;
                clearScene();
                createScene();
            }, onProgress, onError);
        }
    });

    var uploadBtn = document.getElementById('upload-btn');
    uploadBtn.addEventListener('click', function () {
        customObjFile.click();
    });

    var instanceSlider = document.getElementById('instance-slider');
    instanceSlider.addEventListener('change', function () {
        instances = instanceSlider.value;
        clearScene();
        createScene();
    });

    var subdivisionSlider = document.getElementById('subdivision-slider');
    subdivisionSlider.addEventListener('change', function () {
        subdivisions = subdivisionSlider.value;
        clearScene();
        createScene();
    });

    container.addEventListener('mousedown', function () {
        if (needsReset) {
            return;
        }
        start = Date.now();
        explodeGeometry(model.geometry);
    });

    window.addEventListener('resize', function () {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
    });

    animate();
}

/**
 * Remove all objects from the scene.
 */
function clearScene() {
    for (var i = scene.children.length - 1; i >= 0; --i) {
        var obj = scene.children[i];
        scene.remove(obj);
    }
}

/**
 * Create the scene by adding subdivisions, offsets/colors for instancing, and a material to the geometry.
 */
function createScene() {
    var geometry = new THREE.Geometry().fromBufferGeometry(loadedObject.children[0].geometry);
    var modifier = new THREE.BufferSubdivisionModifier(subdivisions);

    geometry = modifier.modify(geometry);
    geometry = new THREE.Geometry().fromBufferGeometry(geometry);
    geometry = new THREE.InstancedBufferGeometry().fromGeometry(geometry);
    geometry.maxInstancedCount = instances;

    var offsets = new THREE.InstancedBufferAttribute(new Float32Array(instances * geometry.attributes.position.array.length), 3, 1);
    for (var i = 0, ul = offsets.count; i != ul; ++i) {
        offsets.setXYZ(i, Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5);
    }
    geometry.addAttribute('offset', offsets);

    var colors = new THREE.InstancedBufferAttribute(new Float32Array(instances * 4), 4, 1);
    for (var i = 0, ul = colors.count; i != ul; ++i) {
        colors.setXYZW(i, Math.random(), Math.random(), Math.random(), 1.0);
    }
    geometry.addAttribute('color', colors);

    var material = new THREE.RawShaderMaterial({
        vertexShader: document.getElementById('vertexShader').textContent,
        fragmentShader: document.getElementById('fragmentShader').textContent,
        side: THREE.DoubleSide,
        transparent: true,
        wireframe: true
    });

    model = new THREE.Mesh(geometry, material);

    scene.add(model);
}

/**
 * Animate any explosions, keep track of when to reset the scene after an explosion, and call the rendering function.
 */
function animate() {
    requestAnimationFrame(animate);

    if (explosionMaterial) {
        explosionMaterial.uniforms['time'].value = .01 * (Date.now() - start);
    }

    if (needsReset && !clock.running) {
        clock.start();
    }
    if (clock.getElapsedTime() >= 3) {
        clock.stop();
        clock = new THREE.Clock(false);
        needsReset = false;
        start = Date.now();
        clearScene();
        createScene();
    }

    render();
}

/**
 * Set the view matrix and render the scene.
 */
function render() {
    camera.lookAt(scene.position);
    renderer.render(scene, camera);
}

/**
 * Adds particle explosions to the scene based on the provided geometry.
 * @param {THREE.InstancedBufferGeometry} bufferGeometry - The subdivided and instanced model geometry.
 */
function explodeGeometry(bufferGeometry) {
    needsReset = true;
    var movementSpeed = 2;
    var dirs = new THREE.InstancedBufferAttribute(
        new Float32Array(bufferGeometry.attributes.offset.array.length),
        3,
        instances / bufferGeometry.attributes.offset.count
    );

    for (var i = 0, ul = dirs.count; i != ul; ++i) {
        dirs.setXYZ(
            i,
            (Math.random() * movementSpeed) - (movementSpeed / 2),
            (Math.random() * movementSpeed) - (movementSpeed / 2),
            (Math.random() * movementSpeed) - (movementSpeed / 2)
        );
    }
    bufferGeometry.addAttribute('dir', dirs);

    explosionMaterial = new THREE.RawShaderMaterial({
        uniforms: {
            time: {
                type: "f",
                value: 0.0
            }
        },
        vertexShader: document.getElementById('explosionVertexShader').textContent,
        fragmentShader: document.getElementById('fragmentShader').textContent
    });
    var particles = new THREE.Points(bufferGeometry, explosionMaterial);

    model.visible = false;

    scene.add(particles);
}
