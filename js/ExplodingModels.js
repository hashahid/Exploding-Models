// TODO: Add .gitignore file
// TODO: Refactor to remove as many global variables as possible, then organize all local variables
// TODO: Fix explosion location
// TODO: Better comments and documentation
// TODO: Fix lighting and remove random colors for instances
// TODO: Fix range of tessellation slider. It should't go up as high as it does
// TODO: Shoot out triangles (instead of points) per face (instead of vertex)
// TODO: Transition to Angular 2 (with Angular 2 Material) and Typescript
// TODO: Support for user-provided .obj files

var camera, scene, renderer;

var model, parts = [];
var instances = document.getElementById('instanceSlider').value;
var subdivisions = document.getElementById('tessSlider').value;
var loadedObject;
var needsReset = false;
var clock = new THREE.Clock(false);

init();
animate();

function init() {
    var container = document.createElement('div');
    document.body.appendChild(container);

    camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 1, 40);
    camera.position.z = 10;

    scene = new THREE.Scene();

    var manager = new THREE.LoadingManager();
    manager.onProgress = function(item, loaded, total) {
        console.log(item, loaded, total);
    };

    var onProgress = function(xhr) {
        if (xhr.lengthComputable) {
            var percentComplete = xhr.loaded / xhr.total * 100;
            console.log(Math.round(percentComplete, 2) + '% downloaded');
        }
    };

    var onError = function(xhr) {};

    var loader = new THREE.OBJLoader(manager);
    loader.load('./resources/wt_teapot.obj', function(object) {
        loadedObject = object;
        createScene();
    }, onProgress, onError);

    renderer = new THREE.WebGLRenderer();
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight);
    container.appendChild(renderer.domElement);

    var instanceSlider = document.getElementById('instanceSlider');
    instanceSlider.addEventListener('change', function() {
        instances = instanceSlider.value;
        clearScene();
        createScene();
    });

    var tessSlider = document.getElementById('tessSlider');
    tessSlider.addEventListener('change', function() {
        subdivisions = tessSlider.value;
        clearScene();
        createScene();
    });

    container.addEventListener('mousedown', onclick, false);
    window.addEventListener('resize', onWindowResize, false);
}

function onclick() {
    if (model) {
        model.visible = false;
    }
    parts.push(new ExplodeAnimation(model.geometry));
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize( window.innerWidth, window.innerHeight );
}

function clearScene() {
    for (var i = scene.children.length - 1; i >= 0; --i) {
        var obj = scene.children[i];
        scene.remove(obj);
    }
}

function createScene() {
    var geometry = new THREE.Geometry().fromBufferGeometry(loadedObject.children[0].geometry);
    var modifier = new THREE.BufferSubdivisionModifier(subdivisions);

    geometry = modifier.modify(geometry);
    geometry = new THREE.Geometry().fromBufferGeometry(geometry);
    geometry = new THREE.InstancedBufferGeometry().fromGeometry(geometry);
    geometry.maxInstancedCount = instances;

    var offsets = new THREE.InstancedBufferAttribute(new Float32Array(instances * geometry.attributes.position.array.length), 3, 1);
    for (var i = 0, ul = offsets.count; i < ul; ++i) {
        offsets.setXYZ(i, Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5);
    }
    geometry.addAttribute('offset', offsets);

    var colors = new THREE.InstancedBufferAttribute(new Float32Array(instances * 4), 4, 1);
    for (var i = 0, ul = colors.count; i < ul; ++i) {
        colors.setXYZW(i, Math.random(), Math.random(), Math.random(), Math.random());
    }
    geometry.addAttribute('color', colors);

    var material = new THREE.RawShaderMaterial({
        uniforms: {
            time: { value: 1.0 },
            sineTime: { value: 1.0 }
        },
        vertexShader: document.getElementById( 'vertexShader' ).textContent,
        fragmentShader: document.getElementById( 'fragmentShader' ).textContent,
        side: THREE.DoubleSide
    });

    model = new THREE.Mesh(geometry, material);

    scene.add(model);
}

function animate() {
    requestAnimationFrame(animate);

    var pCount = parts.length;
    while(pCount--) {
        parts[pCount].update();
    }

    if (needsReset && !clock.running) {
        clock.start();
    }
    if (clock.getElapsedTime() >= 3) {
        clock.stop();
        clock = new THREE.Clock(false);
        needsReset = false;
        clearScene();
        createScene();
    }

    render();
}

function render() {
    camera.lookAt(scene.position);
    renderer.render(scene, camera);

}

function ExplodeAnimation(bufferGeometry) {
    needsReset = true;
    var geometry = new THREE.Geometry(), dirs = [], movementSpeed = 2;

    for (var i = 0, len = bufferGeometry.attributes.offset.count; i < len; ++i) {
        var vertex = new THREE.Vector3();
        vertex.x = bufferGeometry.attributes.offset.array[3 * i];
        vertex.y = bufferGeometry.attributes.offset.array[3 * i + 1];
        vertex.z = bufferGeometry.attributes.offset.array[3 * i + 2];
        geometry.vertices.push(vertex);

        dirs.push({
            x: (Math.random() * movementSpeed) - (movementSpeed/2),
            y: (Math.random() * movementSpeed) - (movementSpeed/2),
            z: (Math.random() * movementSpeed) - (movementSpeed/2)
        });
    }
    var material = new THREE.ParticleBasicMaterial({ size: .03 });
    var particles = new THREE.ParticleSystem(geometry, material);

    this.object = particles;
    this.status = true;

    scene.add(this.object);

    this.update = function() {
        if (this.status) {
            var pCount = bufferGeometry.attributes.offset.count;
            while (pCount--) {
                var particle =  this.object.geometry.vertices[pCount];
                particle.x += dirs[pCount].x;
                particle.y += dirs[pCount].y;
                particle.z += dirs[pCount].z;
            }
            this.object.geometry.verticesNeedUpdate = true;
        }
    }
}
