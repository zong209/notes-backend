# Use an official Python runtime as a parent image
FROM node:10.13.0

#移动当前目录下面的文件到app目录下
ADD . /app/

# Set the working directory to /app
WORKDIR /app

RUN npm install -g cnpm --registry=https://registry.npm.taobao.org
# Install any needed packages specified in requirements.txt
RUN cnpm install

# Make port 80 available to the world outside this container
EXPOSE 9090

# Define environment variable
ENV NAME notes_app_backend

# Run app.py when the container launches
CMD ["node","./bin/www"]