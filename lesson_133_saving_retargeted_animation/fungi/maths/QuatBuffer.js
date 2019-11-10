const B_LEN = 4;

class QuatBuffer{
	constructor( capacity=3, use_all=false ){
		this.capacity	= capacity;
		this.buffer		= new Float32Array( this.capacity * B_LEN );
		this.len 		= 0;

		if( use_all ) this.full_identity();
	}

	///////////////////////////////////////////////////////////////////
	// Buffer Data Management
	///////////////////////////////////////////////////////////////////
		full_identity(){
			let i;
			for( i=0; i < this.buffer.length; i += B_LEN ){
				this.buffer[ i ]	= 0;
				this.buffer[ i+1 ]	= 0;
				this.buffer[ i+2 ]	= 0;
				this.buffer[ i+3 ]	= 1;
			}

			this.len = this.capacity;
			return this;
		}

		push(){
			let t_len = this.len + arguments.length;
			if( t_len > this.capacity ){ console.log("QuatBuffer is at capacity"); return this; }

			let i, ii, offset = this.len * B_LEN;
			for( i=0; i < arguments.length; i++ ){
				ii = offset + i * B_LEN;
				this.buffer[ ii ] 	= arguments[ i ][ 0 ];
				this.buffer[ ii+1 ] = arguments[ i ][ 1 ];
				this.buffer[ ii+2 ] = arguments[ i ][ 2 ];
				this.buffer[ ii+3 ] = arguments[ i ][ 3 ];
			}

			this.len = t_len;
			return this;
		}

		push_raw( x, y, z, w ){
			let t_len = this.len + 1;
			if( t_len > this.capacity ){ console.log("QuatBuffer is at capacity"); return this; }

			let offset = this.len * B_LEN;
			this.buffer[ offset ] 	= x;
			this.buffer[ offset+1 ] = y;
			this.buffer[ offset+2 ] = z;
			this.buffer[ offset+3 ] = w;
			this.len++;

			return this;
		}

		rm( i ){
			if( i >= this.len ){ console.log( "Can not remove, Index is greater then length"); return this; }

			//If removing last one, Just change the length
			let b_idx = this.len - 1;
			if( i == b_idx ){ this.len--; return this; }

			let a_idx				= i * B_LEN;	// Index of Vec to Remove
			b_idx					*= B_LEN;		// Index of Final Vec.
			this.buffer[ a_idx ]	= this.buffer[ b_idx ];
			this.buffer[ a_idx+1 ]	= this.buffer[ b_idx+1 ];
			this.buffer[ a_idx+2 ]	= this.buffer[ b_idx+2 ];
			this.buffer[ a_idx+3 ]	= this.buffer[ b_idx+3 ];
			this.len--;

			return this;
		}

		expand_by( size ){
			let capacity	= this.capacity + size,
				fb			= new Float32Array( capacity * B_LEN ),
				i;

			for( i=0; i < this.buffer.length; i++ ) fb[ i ] = this.buffer[ i ];

			this.capacity	= capacity;
			this.buffer		= fb;

			return this;
		}


	///////////////////////////////////////////////////////////////////
	// Getters / Setters
	///////////////////////////////////////////////////////////////////
		get byte_capacity(){ return this.buffer.byteLength; }	// Total Bytes Available
		get byte_len(){ return this.len * B_LEN * 4; }			// Length of Bytes in Use

		set( i, x, y, z, w ){
			i *= B_LEN;
			this.buffer[ i ]	= x;
			this.buffer[ i+1 ]	= y;
			this.buffer[ i+2 ]	= z;
			this.buffer[ i+3 ]	= w;
			return this;
		}

		copy_to( i, out ){
			i *= B_LEN;
			out[ 0 ] = this.buffer[ i ];
			out[ 1 ] = this.buffer[ i+1 ];
			out[ 2 ] = this.buffer[ i+2 ];
			out[ 3 ] = this.buffer[ i+3 ];
			return out;
		}

		copy( i, v ){
			i *= B_LEN;
			this.buffer[ i ]	= v[0]; 
			this.buffer[ i+1 ]	= v[1]; 
			this.buffer[ i+2 ]	= v[2];
			this.buffer[ i+3 ]	= v[3];
			return this;
		}

		from_axis_angle( i, axis, angle ){ // axis has to be normalized, angle in rads
			let half_angle	= angle * 0.5;
				s			= Math.sin(halfAngle);

			i *= B_LEN;
			this.buffer[ i ]	= axis[ 0 ] * s;
			this.buffer[ i+1 ]	= axis[ 1 ] * s;
			this.buffer[ i+2 ]	= axis[ 2 ] * s;
			this.buffer[ i+3 ]	= Math.cos( halfAngle );
			return this;
		}

		from_mul( i, a, b ){
			let ax = a[0], ay = a[1], az = a[2], aw = a[3],
				bx = b[0], by = b[1], bz = b[2], bw = b[3];

			i *= B_LEN;
			this.buffer[ i ]	= ax * bw + aw * bx + ay * bz - az * by;
			this.buffer[ i+1 ]	= ay * bw + aw * by + az * bx - ax * bz;
			this.buffer[ i+2 ]	= az * bw + aw * bz + ax * by - ay * bx;
			this.buffer[ i+3 ]	= aw * bw - ax * bx - ay * by - az * bz;
			return this;
		}

		from_lerp( i, a, b, t ){ //Linear Interpolation : (1 - t) * v0 + t * v1;
			let ti	= 1 - t;
			let idx	= 1;
			i *= B_LEN;

			this.buffer[ i ]	= a[0] * ti + b[0] * t;
			this.buffer[ i+1 ]	= a[1] * ti + b[1] * t;
			this.buffer[ i+2 ]	= a[2] * ti + b[2] * t;
			this.buffer[ i+3 ]	= a[3] * ti + b[3] * t;

			return this.norm( idx );
		}

	///////////////////////////////////////////////////////////////////
	// Operations
	///////////////////////////////////////////////////////////////////	
		
		norm( i ){
			i *= B_LEN;

			let x	= this.buffer[ i ],
				y	= this.buffer[ i+1 ],
				z	= this.buffer[ i+2 ],
				w	= this.buffer[ i+3 ],
				mag = Math.sqrt( x**2 + y**2 + z**2 + w**2 );

			if( mag == 0 ) return this;

			mag = 1 / mag;
			this.buffer[ i ]	= x * mag;
			this.buffer[ i+1 ]	= y * mag;
			this.buffer[ i+2 ]	= z * mag;
			this.buffer[ i+3 ]	= w * mag;
			return this;
		}


		// Ported to JS from C# example at https://pastebin.com/ubATCxJY
		// Note, if Dir and Up are equal, a roll happens.
		look( i, v_dir, v_up ){
			var z_axis	= new Vec3( v_dir ),	//Forward
				x_axis	= new Vec3(),			//Right
				y_axis	= new Vec3();

			Vec3.cross( v_up, z_axis, x_axis );
			Vec3.cross( z_axis, x_axis, y_axis ); //new up

			x_axis.norm();
			y_axis.norm();
			z_axis.norm();

			//fromAxis - Mat3 to Quat
			let m00 = x_axis.x, m01 = x_axis.y, m02 = x_axis.z,
				m10 = y_axis.x, m11 = y_axis.y, m12 = y_axis.z,
				m20 = z_axis.x, m21 = z_axis.y, m22 = z_axis.z,
				t	= m00 + m11 + m22,
				x, y, z, w, s;

			if( t > 0.0 ){
				s = Math.sqrt( t + 1.0 );
				w = s * 0.5 ; // |w| >= 0.5
				s = 0.5 / s;
				x = (m12 - m21) * s;
				y = (m20 - m02) * s;
				z = (m01 - m10) * s;
			}else if((m00 >= m11) && (m00 >= m22)){
				s = Math.sqrt(1.0 + m00 - m11 - m22);
				x = 0.5 * s;// |x| >= 0.5
				s = 0.5 / s;
				y = (m01 + m10) * s;
				z = (m02 + m20) * s;
				w = (m12 - m21) * s;
			}else if(m11 > m22){
				s = Math.sqrt(1.0 + m11 - m00 - m22);
				y = 0.5 * s; // |y| >= 0.5
				s = 0.5 / s;
				x = (m10 + m01) * s;
				z = (m21 + m12) * s;
				w = (m20 - m02) * s;
			}else{
				s = Math.sqrt(1.0 + m22 - m00 - m11);
				z = 0.5 * s; // |z| >= 0.5
				s = 0.5 / s;
				x = (m20 + m02) * s;
				y = (m21 + m12) * s;
				w = (m01 - m10) * s;
			}

			i *= B_LEN;
			this.buffer[ i ]	= x;
			this.buffer[ i+1 ]	= y;
			this.buffer[ i+2 ]	= z;
			this.buffer[ i+3 ]	= w;
			return this;
		}
}

export default QuatBuffer;