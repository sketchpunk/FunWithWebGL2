# Fun with WebGL 2.0 - 137 - IK Rigs
**Description**:
This is a mini series in where i break down the IK Rigs system I developed that was inspired by Ubisoft's GDC talk about their own IK Rigs. The main goal is to be able to read an animation, translate each pose into a set of IK bits of data that we can then apply to various other meshes without being remotely similar to the animation's own skeleton.

To prove that point, we use a humanoid model thats shorter then our source to use as a simple baseline translation from one human to another. Then we also use a Robot dinosaur which is very different from the source. For example, human src have a 2 bone leg but dino has 3, so we end up using various IK Solvers to deal with different bone configurations. Then there's a tail which there is no animation data for it, so we use springs to procedurally move extra parts based on the movement the model is able to replicate. There are other differences that the dino skeleton has but by the end you'll see its possible to translate human motion into an animal body.

This is really just the beginning of IK Rigs. With the hard part out of the way, we can then explore other various things from the GDC talk further the development of IK Rigs which will eventually become future tutorials. So I welcome all to this new journey.

### Links of Interest

[Ubisoft GDC IK Rig : Procedural Pose Animation](https://www.youtube.com/watch?v=KLjTU0yKS00&)


### Links
* [Lesson on Youtube]()
* [Youtube Series PlayList](https://www.youtube.com/playlist?list=PLMinhigDWz6emRKVkVIEAaePW7vtIkaIF)
* [Twitter](https://twitter.com/SketchpunkLabs)
* [Patreon](https://www.patreon.com/sketchpunk)