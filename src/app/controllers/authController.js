const express = require('express');
const bcript = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const mailer = require('../../modules/mailer');
const hbs = require('handlebars');

const authConfig = require('../../config/auth');

const User = require('../models/user');

const router = express.Router();

router.post('/register', async (req, res) => {
    const {email} = req.body;

    try{
        if(await User.findOne({ email })){
            return res.status(400).send({error: 'User already exists'});
        }

        const user = await User.create(req.body);

        user.password = undefined;

        return res.send({
            user,
            token: generateToken({id: user.id})
        });
    }catch(err){
        return res.status(400).send({ error: 'Registration failed' });
    }
});

function generateToken(params = {}){
    return token = jwt.sign(params, authConfig.secret, {expiresIn: 86400});
}

router.post('/authenticate', async (req, res) => {
    const { email, password } = req.body;

    try {
        const user = await User.findOne({ email }).select('+password');

        if(!user){
            return res.status(400).send({error: 'User not found'});
        }

        if(!await bcript.compare(password, user.password)){
            return res.status(400).send({ error: 'Invalid password' });
        }

        user.password = undefined;

        res.send({
            user,
            token: generateToken({id: user.id})
        });

    } catch (error) {
        console.log(error);
    }

});

router.post('/forgot_password', async (req, res) => {
    const { email } = req.body;
    try {
        const user = await User.findOne({ email });
        if(!user){
            return res.status(400).send({error: 'User not found'});
        }

        const token = crypto.randomBytes(20).toString('hex');
        const now = new Date();
        now.setHours(now.getHours() + 1);

        await User.findByIdAndUpdate(user.id, {
            '$set' : {
                passwordResetToken: token,
                passwordResetExpires: now,
            }
        });

        try {
            mailer.sendMail({
                to: email,
                from: 'giomerito.dev@gmail.com',
                subject: 'Forgot password',
                html: `
                  <p>Para recuperar sua senha use este token: ${token}</p>
                `,                
            }, (err) => {
                if(err){
                    console.log(err);
                    return res.status(400).send({ error: 'Cannot send forgot password email' });
                }
                return res.send("Email enviado!");
            });
        } catch (error) {
            console.log(error);
            res.status(400).send({ error: 'Errou no mailer sendMail' });
        }


    } catch (error) {
      console.log(error);
        res.status(400).send({ error: 'Error on forgot password, try again' });
    }
});

router.post('/reset_password', async (req, res) => {
    const { email, token, password } = req.body;

    try {

        const user = await User.findOne({ email })
        .select('+passwordResetToken passwordResetExpires');

        if(!user){
            return res.status(400).send({ error: 'User not found' });
        }

        if(token !== user.passwordResetToken){
            return res.status(400).send({ error: 'Token invalid' });
        }

        const now = new Date();

        if(now > user.passwordResetExpires){
            return res.status(400).send({ error: "Token expired, generate a new one" });
        }

        user.password = password;

        await user.save();

        res.send("Ok");
        
    } catch (error) {
        res.status(400).send({ error: 'Cannot reset password, try again'});
    }

});

module.exports = app => app.use('/auth', router);
