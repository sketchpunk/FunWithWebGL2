import Maths, { Quat, Vec3 }	from "../fungi/maths/Maths.js";
import Transform				from "../fungi/maths/Transform.js";
import Axis						from "../fungi/maths/Axis.js";

class IKTarget{
	constructor(){
		this.start_pos		= new Vec3();	// World Position start of an IK Chain
		this.end_pos		= new Vec3();	// The End Effector ( Target Position )
		this.axis 			= new Axis();	// Target Axis, Defines Forward and Up mainly.
		this.len_sqr		= 0;			// Distance Squared from Start to End, Faster to check lengths by Squared to avoid using Sqrt to get real lengths.
		this.len			= 0;
	}

	/////////////////////////////////////////////////////////////////////
	// GETTERS - SETTERS
	/////////////////////////////////////////////////////////////////////	
		
		/** Define the target based on a Start and End Position along with
			Up direction or the direction of the bend. */
		from_pos( pA, pB, up_dir ){
			this.start_pos.copy( pA );
			this.end_pos.copy( pB );

			this.len_sqr	= this.axis.z.from_sub( pB, pA ).len_sqr();
			this.len		= Math.sqrt( this.len_sqr );

			this.axis.from_dir( this.axis.z, up_dir );
			return this;
		}

		from_pos_dir( pos, dir, up_dir, len_scl ){
			this.start_pos.copy( pos );
			this.end_pos
				.from_scale( dir, len_scl )	// Compute End Effector
				.add( pos );

			this.len_sqr	= Vec3.len_sqr( pos, this.end_pos );
			this.len		= Math.sqrt( this.len_sqr );

			this.axis.from_dir( dir, up_dir ); // Target Axis
			return this;
		}

	/////////////////////////////////////////////////////////////////////
	// 
	/////////////////////////////////////////////////////////////////////
		
		/** Visually see the Target information */
		debug( d, scl=1.0 ){ 
			let v = new Vec3(),
				p = this.start_pos,
				a = this.axis;
			d	.ln( p, v.from_scale( a.z , scl ).add( p ), "green" )
				.ln( p, v.from_scale( a.x , scl ).add( p ), "red" )
				.ln( p, v.from_scale( a.y , scl ).add( p ), "blue" )
				.pnt( p, "green", 0.05, 1 )
				.pnt( this.end_pos, "red", 0.05, 1 );
			return this;
		}

	///////////////////////////////////////////////////////////////////
	// Single Bone Solvers
	///////////////////////////////////////////////////////////////////
		
		_aim_bonexxx( chain, pose, p_wt, out ){
			/*
			The idea is to Aim the root bone in the direction of the target. Originally used a lookAt rotation 
			then correcting it to take in account the bone's points up, not forward.

			Instead, Build a rotation based on axis direction. Start by using target's fwd dir as the bone's up dir.
			To Help keep orientation, use the bone's Bind( or TPose ) world space fwd as a starting point to help get
			the left dir. With UP and Left, do another cross product for fwd to keep the axis orthogonal.

			This aims the limb pretty well at the target. The final step is to twist the limb so its joint (elbow, knee)
			is pointing at the UP dir of the target axis. This helps define how much twisting we need to apply to the bone.
			Arm and Knees tend to have different natural pose. The leg's fwd is fwd but the arm's fwd may be point down or back,
			all depends on how the rigging was setup.

			Since he bone is now aligned to the target, it shares the same Direction axis that we can then easily apply a twist
			rotation. The target's UP is final dir, so we take the lumb's aligning axis's world space dire and simply use 
			Quat.rotateTo( v1, v2 ). This function creates a rotation needed to get from One Vector dir to the other.
			*/
			
			let rot		= Quat.mul( p_wt.rot, pose.get_local_rot( chain.bones[0].idx ) ),	// Get World Space Rotation for Bone
				f_dir	= Vec3.transform_quat( Vec3.FORWARD, rot ),					// Get Bone's WS Forward Dir
				l_dir	= Vec3.cross( this.axis.z, f_dir ).norm();					// WS Left Dir

			f_dir.from_cross( l_dir, this.axis.z ).norm();							// Realign forward to keep axis orthogonal for proper rotation

			out.from_axis( l_dir, this.axis.z, f_dir );								// Final World Space Rotation
			if( Quat.dot( out, rot ) < 0 ) out.negate();							// If axis is point in the opposite direction of the bind rot, flip the signs : Thx @gszauer

			//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
			// Need to apply a twist rotation to aim the bending joint 
			// (elbow,knee) in the direction of the IK Target UP Axis.

			let align_dir;
			switch( chain.align_axis ){ // Arm/Legs have different Axis to align to Twisting.
				case "x": align_dir = l_dir; break;
				case "z": align_dir = f_dir; break;
			}
			
			//console.log("epp", Vec3.dot( align_dir, this.axis.y ) );
			//####################################################
			let b = pose.bones[ chain.first() ];
			let t = new Transform();
			t.from_add( p_wt, b.local );
			//console.log(  chain.align_axis  );
			//App.Debug.ln( t.pos, Vec3.add( t.pos, align_dir ), "orange" );
			//App.Debug.ln( t.pos, Vec3.add( t.pos, this.axis.y ), "white" );
			//####################################################

			// Shortest Twisting Direction
			let vdot = Vec3.dot( align_dir, this.axis.y );
			if( vdot < 0 ) align_dir.invert();
			

			// Create and apply twist rotation.
			rot.from_unit_vecs( align_dir, this.axis.y );
			out.pmul( rot );


			return out;
		}

		aimxxx( chain, tpose, pose, p_wt ){
			let rot = new Quat();
			this._aim_bone( chain, tpose, p_wt, rot );
			rot.pmul_invert( p_wt.rot ); // Convert to Bone's Local Space by mul invert of parent bone rotation
			pose.set_bone( chain.bones[ 0 ].idx, rot );
		}

		aim2( chain, tpose, pose, p_wt ){
			let rot = new Quat();
			this._aim_bone2( chain, tpose, p_wt, rot );

			rot.pmul_invert( p_wt.rot ); // Convert to Bone's Local Space by mul invert of parent bone rotation
			pose.set_bone( chain.bones[ 0 ].idx, rot );
		}

		_aim_bone2( chain, tpose, p_wt, out ){
			let rot	= Quat.mul( p_wt.rot, tpose.get_local_rot( chain.first() ) ),	// Get World Space Rotation for Bone
				dir	= Vec3.transform_quat( chain.alt_fwd, rot );					// Get Bone's WS Forward Dir

			//let ct = new Transform();
			//let b = tpose.bones[ chain.first() ];
			//ct.from_add( p_wt, b.local );
			//App.Debug.pnt( ct.pos, "white", 0.03 );
			//App.Debug.ln( ct.pos, Vec3.add( ct.pos, f_dir), "orange" );

			//Swing
			let q = Quat.unit_vecs( dir, this.axis.z );
			out.from_mul( q, rot );

			// Twist 
			//let u_dir	= Vec3.transform_quat( chain.alt_up, out );
			//let twist 	= Vec3.angle( u_dir, this.axis.y );
			//App.Debug.ln( ct.pos, Vec3.add( ct.pos, u_dir), "white" );

			dir.from_quat( out, chain.alt_up );				// After Swing, Whats the UP Direction
			let twist 	= Vec3.angle( dir, this.axis.y );	// Get difference between Swing Up and Target Up

			if( twist <= 0.00017453292 ) twist = 0;
			else{
				//let l_dir  	= Vec3.cross( dir, this.axis.z );
				dir.from_cross( dir, this.axis.z );	// Get Swing LEFT, used to test if twist is on the negative side.
				//App.Debug.ln( ct.pos, Vec3.add( ct.pos, l_dir), "black" );

				if( Vec3.dot( dir, this.axis.y ) >= 0 ) twist = -twist; 
			}
	
			out.pmul_axis_angle( this.axis.z, twist );	// Apply Twist

			//if( Quat.dot( out, rot ) < 0 ) out.negate();	

			//console.log( Quat.dot( rot, out ) );
		
/*

	q.from_unit_vecs( Vec3.FORWARD, p_fwd )			// Rotation Difference From True FWD and Pose FWD, Swing Rotation
		.mul( tb.world.rot );						// Apply Swing to TPose WS Rotation, gives Swing in WS

	//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
	let s_up	= Vec3.transform_quat( t_up, q ),	// Get UP Direction of the Swing Rotation
		twist	= Vec3.angle( s_up, p_up );			// Swing+Pose have same Fwd, Use Angle between both UPs for twist

	if( twist <= (0.01 * Math.PI / 180) ){
		twist = 0; // If Less the .01 Degree, dont bother twisting.
	}else{
		// Swing FWD and Pose FWD Should be the same in ws, So no need to calc it,
		// So using Pose Fwd and Swing up to get Swing left
		// Is the Angle going to be Negative?, use Swing Left to determine if 
		// its in the left or right side of UP
		let s_lft = Vec3.cross( s_up, p_fwd ).norm();
		if( Vec3.dot( s_lft, p_up ) >= 0 )	twist = -twist; 
	}

*/
			
		}

	///////////////////////////////////////////////////////////////////
	// Multi Bone Solvers
	///////////////////////////////////////////////////////////////////
		
		limb( chain, tpose, pose, p_wt ){
			//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
			// Using law of cos SSS, so need the length of all sides of the triangle
			let bind_a 	= tpose.bones[ chain.bones[0].idx ],	// Bone Reference from Bind
				bind_b	= tpose.bones[ chain.bones[1].idx ],
				pose_a 	= pose.bones[ chain.bones[0].idx ],		// Bone Reference from Pose
				pose_b	= pose.bones[ chain.bones[1].idx ],
				aLen	= bind_a.len,
				bLen	= bind_b.len,
				cLen	= this.len,
				rot 	= new Quat(),	
				rad;

			//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
			// FIRST BONE - Aim then rotate by the angle.
			this._aim_bone2( chain, tpose, p_wt, rot );				// Aim the first bone toward the target oriented with the bend direction.

			rad	= Maths.lawcos_sss( aLen, cLen, bLen );				// Get the Angle between First Bone and Target.
			
			rot	.pmul_axis_angle( this.axis.x, -rad )				// Use the Target's X axis for rotation along with the angle from SSS
				.pmul_invert( p_wt.rot );							// Convert to Bone's Local Space by mul invert of parent bone rotation

			pose.set_bone( bind_a.idx, rot );						// Save result to bone.
			pose_a.world											// Update World Data for future use
				.copy( p_wt )
				.add( rot, bind_a.local.pos, bind_a.local.scl );

			//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
			// SECOND BONE
			// Need to rotate from Right to Left, So take the angle and subtract it from 180 to rotate from 
			// the other direction. Ex. L->R 70 degrees == R->L 110 degrees
			rad	= Math.PI - Maths.lawcos_sss( aLen, bLen, cLen );
			
			rot .from_mul( pose_a.world.rot, bind_b.local.rot )		// Add Bone 2's Local Bind Rotation to Bone 1's new World Rotation.
				.pmul_axis_angle( this.axis.x, rad )				// Rotate it by the target's x-axis
				.pmul_invert( pose_a.world.rot );					// Convert to Bone's Local Space

			pose.set_bone( bind_b.idx, rot );						// Save result to bone.
			pose_b.world											// Update World Data for future use
				.copy( pose_a.world )
				.add( rot, bind_b.local.pos, bind_b.local.scl );
		}

		three_bone( chain, tpose, pose, p_wt ){
			//------------------------------------
			// Get the length of the bones, the calculate the ratio length for the bones based on the chain length
			// The 3 bones when placed in a zig-zag pattern creates a Parallelogram shape. We can break the shape down into two triangles
			// By using the ratio of the Target length divided between the 2 triangles, then using the first bone + half of the second bound
			// to solve for the top 2 joiints, then uing the half of the second bone + 3rd bone to solve for the bottom joint.
			// If all bones are equal length,  then we only need to use half of the target length and only test one triangle and use that for
			// both triangles, but if bones are uneven, then we need to solve an angle for each triangle which this function does.	

			//------------------------------------
			let bind_a 	= tpose.bones[ chain.bones[0].idx ],	// Bone Reference from Bind
				bind_b	= tpose.bones[ chain.bones[1].idx ],
				bind_c	= tpose.bones[ chain.bones[2].idx ],

				pose_a 	= pose.bones[ chain.bones[0].idx ],			// Bone Reference from Pose
				pose_b	= pose.bones[ chain.bones[1].idx ],
				pose_c	= pose.bones[ chain.bones[2].idx ],				

				a_len	= bind_a.len,				// First Bone length
				b_len 	= bind_b.len,				// Second Bone Length
				c_len	= bind_c.len,				// Third Bone Length
				bh_len 	= bind_b.len * 0.5,			// How Much of Bone 2 to use with Bone 1

				t_ratio	= ( a_len + bh_len ) / ( a_len + b_len + c_len ),	// How much to subdivide the Target length between the two triangles
				ta_len = this.len * t_ratio,								// Goes with A & B
				tb_len = this.len - ta_len,									// Goes with B & C

				rot 	= new Quat(),
				rad;
				
			//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
			// Bone A 
			this._aim_bone2( chain, tpose, p_wt, rot );		// Aim the first bone toward the target oriented with the bend direction.

			rad	= Maths.lawcos_sss( a_len, ta_len, bh_len );	// Get the Angle between First Bone and Target.
			rot
				.pmul_axis_angle( this.axis.x, -rad )			// Rotate the the aimed bone by the angle from SSS
				.pmul_invert( p_wt.rot );							// Convert to Bone's Local Space by mul invert of parent bone rotation

			pose.set_bone( bind_a.idx, rot );

			pose_a.world
				.copy( p_wt )
				.add( rot, bind_a.local.pos, bind_a.local.scl );

			//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
			// Bone B
			rad = Math.PI - Maths.lawcos_sss( a_len, bh_len, ta_len );

			rot .from_mul( pose_a.world.rot, bind_b.local.rot )	// Add Bone Local to get its WS rot
				.pmul_axis_angle( this.axis.x, rad )			// Rotate it by the target's x-axis .pmul( tmp.from_axis_angle( this.axis.x, rad ) )
				.pmul_invert( pose_a.world.rot );				// Convert to Local Space in temp to save WS rot for next bone.

			pose.set_bone( bind_b.idx, rot );

			pose_b.world
				.copy( pose_a.world )
				.add( rot, bind_b.local.pos, bind_b.local.scl );

			//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
			// Bone C
			rad = Math.PI - Maths.lawcos_sss( c_len, bh_len, tb_len );
			rot	.from_mul( pose_b.world.rot, bind_c.local.rot  )	// Still contains WS from previous bone, Add next bone's local
				.pmul_axis_angle( this.axis.x, -rad )				// Rotate it by the target's x-axis
				.pmul_invert( pose_b.world.rot );									// Convert to Bone's Local Space

			pose.set_bone( bind_c.idx, rot );

			pose_c.world
				.copy( pose_b.world )
				.add( rot, bind_c.local.pos, bind_c.local.scl );
		}
}

export default IKTarget;